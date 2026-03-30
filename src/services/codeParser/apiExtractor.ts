/**
 * API endpoint detection and extraction from TypeScript AST
 */

import * as ts from 'typescript';
import { APIEndpointInfo, TypeInfo } from '../../types/codeContext';
import { countTokens } from '../../utils/tokenizer';
import { hasExportModifier } from './parserHelpers';

export function isAPIHandler(node: ts.Node, path: string): boolean {
  // Next.js API routes are in /api/ directory
  if (!path.includes('/api/') && !path.includes('\\api\\')) {
    return false;
  }

  // Look for exported GET, POST, PUT, DELETE, PATCH functions
  if (ts.isFunctionDeclaration(node) && node.name) {
    const name = node.name.text;
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(name);
  }

  if (ts.isVariableStatement(node)) {
    for (const decl of node.declarationList.declarations) {
      if (ts.isIdentifier(decl.name)) {
        const name = decl.name.text;
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(name)) {
          return true;
        }
      }
    }
  }

  return false;
}

export function extractAPIEndpoints(
  node: ts.Node,
  path: string,
  sourceFile: ts.SourceFile
): APIEndpointInfo[] {
  const endpoints: APIEndpointInfo[] = [];
  const routePath = extractRoutePath(path);

  const addEndpoint = (method: string, funcNode: ts.Node) => {
    const hasAuth = detectAuthCheck(funcNode, sourceFile);
    const { requestType, responseType } = extractAPITypes(funcNode, sourceFile);

    endpoints.push({
      method: method as APIEndpointInfo['method'],
      path: routePath,
      hasAuth,
      requestType,
      responseType,
      line: sourceFile.getLineAndCharacterOfPosition(funcNode.getStart()).line + 1,
    });
  };

  if (ts.isFunctionDeclaration(node) && node.name) {
    addEndpoint(node.name.text, node);
  } else if (ts.isVariableStatement(node)) {
    for (const decl of node.declarationList.declarations) {
      if (ts.isIdentifier(decl.name)) {
        addEndpoint(decl.name.text, node);
      }
    }
  }

  return endpoints;
}

export function extractRoutePath(filePath: string): string {
  // Convert file path to API route path
  // e.g., src/app/api/users/[id]/route.ts -> /api/users/[id]
  const match = filePath.match(/[/\\]api[/\\](.+)[/\\]route\.(ts|js)$/);
  if (match) {
    return '/api/' + match[1].replace(/\\/g, '/');
  }
  return filePath;
}

export function detectAuthCheck(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  const text = node.getText(sourceFile).toLowerCase();
  return (
    text.includes('auth') ||
    text.includes('session') ||
    text.includes('token') ||
    text.includes('unauthorized') ||
    text.includes('401')
  );
}

export function extractAPITypes(
  node: ts.Node,
  sourceFile: ts.SourceFile
): { requestType?: string; responseType?: string } {
  // This is a simplified extraction - could be enhanced
  const text = node.getText(sourceFile);
  let requestType: string | undefined;
  let responseType: string | undefined;

  // Look for type assertions or explicit types
  const requestMatch = text.match(/request\.json\(\)\s*as\s+(\w+)/);
  if (requestMatch) {
    requestType = requestMatch[1];
  }

  const responseMatch = text.match(/NextResponse\.json<(\w+)>/);
  if (responseMatch) {
    responseType = responseMatch[1];
  }

  return { requestType, responseType };
}

export function extractType(
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration,
  sourceFile: ts.SourceFile
): TypeInfo {
  const definition = node.getText(sourceFile);
  const tokenCount = countTokens(definition);
  let extends_: string[] | undefined;

  if (ts.isInterfaceDeclaration(node) && node.heritageClauses) {
    extends_ = node.heritageClauses
      .filter((c) => c.token === ts.SyntaxKind.ExtendsKeyword)
      .flatMap((c) => c.types.map((t) => t.getText(sourceFile)));
  }

  return {
    name: node.name.text,
    kind: ts.isInterfaceDeclaration(node)
      ? 'interface'
      : ts.isEnumDeclaration(node)
        ? 'enum'
        : 'type',
    exported: hasExportModifier(node),
    definition,
    tokenCount,
    extends: extends_,
    line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
  };
}
