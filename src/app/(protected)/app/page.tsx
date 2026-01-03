'use client';

import { motion } from 'framer-motion';
import { MainBuilderView } from '@/components/MainBuilderView';

export default function AppPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <MainBuilderView />
    </motion.div>
  );
}
