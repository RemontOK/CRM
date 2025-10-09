import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Assignment,
  People,
  Inventory,
  Group,
  PointOfSale,
  Assessment,
  Settings,
  Notifications,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const drawerWidth = 280;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { text: 'Дашборд', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Заказы', icon: <Assignment />, path: '/orders' },
    { text: 'Клиенты', icon: <People />, path: '/clients' },
    { text: 'Склад', icon: <Inventory />, path: '/inventory' },
    { text: 'Сотрудники', icon: <Group />, path: '/employees' },
    { text: 'Касса', icon: <PointOfSale />, path: '/cash-register' },
    { text: 'Отчеты', icon: <Assessment />, path: '/reports' },
    { text: 'Настройки', icon: <Settings />, path: '/settings' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
  };

  const drawer = (
    <Box>
      <Box
        sx={{
          p: 3,
          background: '#1A1A1A',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#FF6B35' }}>
          НЭК СЕРВИС
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5, color: '#9E9E9E' }}>
          CRM Система
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 2, py: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.text}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Box
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  mb: 1,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                {item.icon}
                <Typography variant="body1" sx={{ ml: 2, fontWeight: isActive ? 600 : 400 }}>
                  {item.text}
                </Typography>
              </Box>
            </motion.div>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            backgroundColor: '#1A1A1A',
            color: 'text.primary',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Дашборд'}
          </Typography>
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {user?.name?.charAt(0)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Горизонтальная навигационная панель */}
      <Box
        sx={{
          position: 'fixed',
          top: 64, // Под AppBar
          left: { md: drawerWidth },
          right: 0,
          zIndex: 1100,
          backgroundColor: '#1A1A1A',
          borderBottom: '1px solid rgba(255,107,53,0.2)',
          display: { xs: 'none', md: 'flex' }, // Скрываем на мобильных
          borderRadius: '0 0 8px 8px', // Скругленные углы снизу
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            width: '100%',
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              height: 4,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#1A1A1A',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#FF6B35',
              borderRadius: 2,
            },
          }}
        >
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <React.Fragment key={item.text}>
                <Box
                  onClick={() => navigate(item.path)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    borderRadius: 1,
                    transition: 'all 0.2s ease-in-out',
                    backgroundColor: isActive ? 'rgba(255,107,53,0.2)' : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive ? 'rgba(255,107,53,0.3)' : 'rgba(255,107,53,0.1)',
                    },
                    whiteSpace: 'nowrap',
                    minWidth: 'fit-content',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.875rem',
                      color: isActive ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {item.text}
                  </Typography>
                </Box>
                {index < menuItems.length - 1 && (
                  <Box
                    sx={{
                      width: '1px',
                      height: '20px',
                      backgroundColor: 'rgba(255,107,53,0.3)',
                      mx: 1,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </Box>
      </Box>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: '#1A1A1A',
              borderRight: '1px solid rgba(255,107,53,0.2)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: '#1A1A1A',
              borderRight: '1px solid rgba(255,107,53,0.2)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
            mt: { xs: 8, md: 12 }, // Учитываем навигационную панель на десктопе
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: '#1A1A1A',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => navigate('/settings')}>
          <AccountCircle fontSize="small" sx={{ mr: 1 }} />
          Профиль
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout fontSize="small" sx={{ mr: 1 }} />
          Выйти
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;


