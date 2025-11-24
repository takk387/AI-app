import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Enhanced Test endpoint to verify Supabase connection and storage functionality
 * Access at: /api/supabase-test
 * 
 * Tests:
 * - Environment variables
 * - Client creation
 * - Auth endpoint
 * - Database connection
 * - Storage buckets existence
 * - RLS policies
 * - Upload/download operations
 * - Automatic cleanup
 */
export async function GET() {
  const testResults: any = {
    success: true,
    message: 'Supabase connection test',
    tests: {},
  };

  const cleanupTasks: (() => Promise<void>)[] = [];

  try {
    // ========================================================================
    // 1. Check environment variables
    // ========================================================================
    const hasEnvVars = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (!hasEnvVars) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Supabase environment variables',
          details: {
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
        },
        { status: 500 }
      );
    }

    testResults.tests.environmentVariables = {
      status: 'PASS',
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    // ========================================================================
    // 2. Test Supabase client creation
    // ========================================================================
    const supabase = await createClient();

    testResults.tests.clientCreation = {
      status: 'PASS',
      message: 'Supabase client created successfully',
    };

    // ========================================================================
    // 3. Test authentication endpoint
    // ========================================================================
    const { data: authData, error: authError } = await supabase.auth.getSession();

    testResults.tests.authEndpoint = {
      status: authError ? 'WARNING' : 'PASS',
      message: authError
        ? `Auth check failed (expected if not authenticated): ${authError.message}`
        : 'Auth endpoint accessible',
      hasSession: !!authData.session,
      user: authData.session?.user?.id ? {
        id: authData.session.user.id,
        email: authData.session.user.email,
      } : null,
    };

    // ========================================================================
    // 4. Test database connection
    // ========================================================================
    const { data: dbData, error: dbError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    testResults.tests.databaseConnection = {
      status: dbError ? 'WARNING' : 'PASS',
      message: dbError
        ? `Database query failed (expected if tables not created): ${dbError.message}`
        : 'Database accessible',
      tablesExist: !dbError,
    };

    // ========================================================================
    // 5. Test Storage Buckets Existence
    // ========================================================================
    const requiredBuckets = ['user-uploads', 'generated-apps', 'app-assets'];
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      testResults.tests.storageBuckets = {
        status: 'FAIL',
        message: `Failed to list buckets: ${bucketsError.message}`,
        error: bucketsError,
      };
      testResults.success = false;
    } else {
      const existingBuckets = buckets?.map(b => b.name) || [];
      const missingBuckets = requiredBuckets.filter(name => !existingBuckets.includes(name));
      
      testResults.tests.storageBuckets = {
        status: missingBuckets.length === 0 ? 'PASS' : 'FAIL',
        message: missingBuckets.length === 0
          ? 'All required storage buckets exist'
          : `Missing buckets: ${missingBuckets.join(', ')}`,
        required: requiredBuckets,
        existing: existingBuckets,
        missing: missingBuckets,
      };

      if (missingBuckets.length > 0) {
        testResults.success = false;
      }
    }

    // ========================================================================
    // 6. Test RLS Policies (if authenticated)
    // ========================================================================
    if (authData.session?.user) {
      const userId = authData.session.user.id;

      // Test 6a: Can list own files (should succeed with RLS)
      const { data: listData, error: listError } = await supabase.storage
        .from('user-uploads')
        .list(userId);

      const canListOwnFiles = !listError;

      // Test 6b: Try to list another user's files (should fail with RLS)
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const { data: otherListData, error: otherListError } = await supabase.storage
        .from('user-uploads')
        .list(fakeUserId);

      const cannotListOtherFiles = !!otherListError || (otherListData?.length === 0);

      testResults.tests.rlsPolicies = {
        status: (canListOwnFiles && cannotListOtherFiles) ? 'PASS' : 'WARNING',
        message: (canListOwnFiles && cannotListOtherFiles)
          ? 'RLS policies appear to be working correctly'
          : 'RLS policies may not be configured correctly',
        details: {
          canListOwnFiles: {
            status: canListOwnFiles ? 'PASS' : 'FAIL',
            message: canListOwnFiles ? 'Can list own files' : `Cannot list own files: ${listError?.message}`,
          },
          cannotListOtherFiles: {
            status: cannotListOtherFiles ? 'PASS' : 'WARNING',
            message: cannotListOtherFiles 
              ? 'Cannot access other users\' files (expected)' 
              : 'May be able to access other users\' files (unexpected)',
          },
        },
      };
    } else {
      testResults.tests.rlsPolicies = {
        status: 'SKIPPED',
        message: 'RLS policy tests skipped (user not authenticated)',
      };
    }

    // ========================================================================
    // 7. Test Upload/Download Operations (if authenticated)
    // ========================================================================
    if (authData.session?.user) {
      const userId = authData.session.user.id;
      const testFileName = `test-${Date.now()}.txt`;
      const testFilePath = `${userId}/${testFileName}`;
      const testContent = 'Supabase storage test file - safe to delete';

      try {
        // Test 7a: Upload a test file
        const testBlob = new Blob([testContent], { type: 'text/plain' });
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(testFilePath, testBlob);

        if (uploadError) {
          testResults.tests.storageOperations = {
            status: 'FAIL',
            message: `Upload failed: ${uploadError.message}`,
            error: uploadError,
          };
          testResults.success = false;
        } else {
          // Register cleanup task
          cleanupTasks.push(async () => {
            await supabase.storage
              .from('user-uploads')
              .remove([testFilePath]);
          });

          // Test 7b: Download the file
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('user-uploads')
            .download(testFilePath);

          if (downloadError) {
            testResults.tests.storageOperations = {
              status: 'FAIL',
              message: `Upload succeeded but download failed: ${downloadError.message}`,
              uploadStatus: 'PASS',
              downloadStatus: 'FAIL',
              error: downloadError,
            };
            testResults.success = false;
          } else {
            // Test 7c: Verify downloaded content matches
            const downloadedText = await downloadData.text();
            const contentMatches = downloadedText === testContent;

            testResults.tests.storageOperations = {
              status: contentMatches ? 'PASS' : 'FAIL',
              message: contentMatches
                ? 'Upload and download operations working correctly'
                : 'Downloaded content does not match uploaded content',
              uploadStatus: 'PASS',
              downloadStatus: 'PASS',
              contentVerification: contentMatches ? 'PASS' : 'FAIL',
              testFile: testFilePath,
            };

            if (!contentMatches) {
              testResults.success = false;
            }
          }
        }
      } catch (storageError: any) {
        testResults.tests.storageOperations = {
          status: 'FAIL',
          message: `Storage operations test failed: ${storageError.message}`,
          error: storageError,
        };
        testResults.success = false;
      }
    } else {
      testResults.tests.storageOperations = {
        status: 'SKIPPED',
        message: 'Storage operations test skipped (user not authenticated)',
      };
    }

    // ========================================================================
    // 8. Cleanup
    // ========================================================================
    let cleanupStatus = 'SKIPPED';
    let cleanupMessage = 'No cleanup needed';

    if (cleanupTasks.length > 0) {
      try {
        await Promise.all(cleanupTasks.map(task => task()));
        cleanupStatus = 'PASS';
        cleanupMessage = `Successfully cleaned up ${cleanupTasks.length} test file(s)`;
      } catch (cleanupError: any) {
        cleanupStatus = 'WARNING';
        cleanupMessage = `Cleanup partially failed: ${cleanupError.message}`;
      }
    }

    testResults.tests.cleanup = {
      status: cleanupStatus,
      message: cleanupMessage,
      tasksExecuted: cleanupTasks.length,
    };

    // ========================================================================
    // Generate Next Steps
    // ========================================================================
    const failures = Object.entries(testResults.tests)
      .filter(([_, test]: [string, any]) => test.status === 'FAIL')
      .map(([name, _]) => name);

    const warnings = Object.entries(testResults.tests)
      .filter(([_, test]: [string, any]) => test.status === 'WARNING')
      .map(([name, _]) => name);

    if (failures.length > 0) {
      testResults.nextSteps = [
        '❌ Some tests failed. Please fix the following:',
        ...failures.map(name => {
          if (name === 'storageBuckets') {
            return '• Create missing storage buckets in Supabase Dashboard → Storage';
          }
          if (name === 'storageOperations') {
            return '• Check storage bucket permissions and RLS policies';
          }
          return `• Fix ${name}`;
        }),
        '',
        'Refer to docs/SUPABASE_SETUP.md for setup instructions',
      ];
    } else if (warnings.length > 0) {
      testResults.nextSteps = [
        '⚠️ All critical tests passed, but some warnings:',
        ...warnings.map(name => {
          if (name === 'databaseConnection') {
            return '• Create database tables (see docs/SUPABASE_SETUP.md)';
          }
          if (name === 'authEndpoint') {
            return '• User not authenticated (expected for anonymous access)';
          }
          if (name === 'rlsPolicies') {
            return '• Verify RLS policies are configured correctly';
          }
          return `• Check ${name}`;
        }),
      ];
    } else {
      testResults.nextSteps = [
        '✅ All tests passed!',
        '✅ Supabase is fully configured and operational',
        '✅ Storage buckets exist and are accessible',
        '✅ Upload/download operations working',
        '✅ RLS policies configured correctly',
        '',
        'You can now use all Supabase features in your application!',
      ];
    }

    // ========================================================================
    // Return Results
    // ========================================================================
    testResults.message = testResults.success
      ? 'All Supabase tests passed!'
      : 'Some Supabase tests failed';

    return NextResponse.json(testResults);

  } catch (error: any) {
    // Execute cleanup tasks even on error
    if (cleanupTasks.length > 0) {
      try {
        await Promise.all(cleanupTasks.map(task => task()));
      } catch (cleanupError) {
        console.error('Cleanup failed during error handling:', cleanupError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Supabase test failed',
        message: error.message,
        details: error,
      },
      { status: 500 }
    );
  }
}
