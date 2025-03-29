import { Variants } from 'framer-motion';

// Animation variants for right-side sliding navigation
export const rightSideNavVariants: Variants = {
  hidden: { opacity: 0, x: "100%" },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.07
    }
  },
  exit: { 
    opacity: 0, 
    x: "100%",
    transition: { duration: 0.3 }
  }
};

export const rightSideItemVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 24 
    }
  }
};
