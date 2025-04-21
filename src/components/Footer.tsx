import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiGithub, FiTwitter, FiLinkedin, FiMail, FiHeart, FiBookOpen, FiCalendar, FiBarChart2 } from 'react-icons/fi';
import '../styles/components/Footer.css';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  
  const linkVariants = {
    hover: { scale: 1.05, x: 5 },
    tap: { scale: 0.95 }
  };
  
  const iconVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.2, rotate: 5, y: -3 },
    tap: { scale: 0.9 }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };
  
  return (
    <motion.footer 
      className="app-footer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      <div className="footer-container">
        <motion.div 
          className="footer-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="footer-section brand-section"
            variants={itemVariants}
          >
            <h3 className="footer-title">StudyFlow</h3>
            <p className="footer-description">
              Your all-in-one solution for managing your academic journey, organizing schedules, and tracking progress.
            </p>
          </motion.div>
          
          <motion.div 
            className="footer-section links-section"
            variants={itemVariants}
          >
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-links">
              <motion.li whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
                  <Link to="/"><FiBookOpen style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Home</Link>
                </motion.div>
              </motion.li>
              <motion.li whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
                  <Link to="/schedule"><FiCalendar style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Schedule</Link>
                </motion.div>
              </motion.li>
              <motion.li whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
                  <Link to="/tracker"><FiBarChart2 style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Progress</Link>
                </motion.div>
              </motion.li>
            </ul>
          </motion.div>
          
          {/* <motion.div 
            className="footer-section contact-section"
            variants={itemVariants}
          >
            <h3 className="footer-title">Connect With Us</h3>
            <div className="social-links">
              <motion.a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover="hover"
                whileTap="tap"
                variants={iconVariants}
                aria-label="GitHub"
              >
                <FiGithub />
              </motion.a>
              <motion.a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover="hover"
                whileTap="tap"
                variants={iconVariants}
                aria-label="Twitter"
              >
                <FiTwitter />
              </motion.a>
              <motion.a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover="hover"
                whileTap="tap"
                variants={iconVariants}
                aria-label="LinkedIn"
              >
                <FiLinkedin />
              </motion.a>
              <motion.a 
                href="mailto:contact@studyflow.com"
                whileHover="hover"
                whileTap="tap"
                variants={iconVariants}
                aria-label="Email us"
              >
                <FiMail />
              </motion.a>
            </div>
            <motion.p 
              className="contact-info"
              variants={itemVariants}
              style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted, #6b7280)' }}
            >
              Have questions? Get in touch with us.
            </motion.p>
          </motion.div> */}
        </motion.div>
        
        <motion.div 
          className="footer-bottom"
          variants={itemVariants}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <p className="copyright">
            &copy; {year} StudyFlow. All rights reserved.
          </p>
          <motion.p 
            className="made-with"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
          >
            Made with <FiHeart className="heart-icon" /> by StudyFlow Team
          </motion.p>
        </motion.div>
      </div>
    </motion.footer>
  );
};

export default Footer;
