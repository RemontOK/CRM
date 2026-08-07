import React from 'react';
import { Chip, Menu, MenuItem } from '@mui/material';
import { Order } from '../../types';

export type OrderStatusOption = {
  value: string;
  label: string;
  color: string;
};

type StatusBadgeSelectorProps = {
  value: Order['status'];
  options: OrderStatusOption[];
  onChange: (nextStatus: Order['status']) => void;
  stopPropagation?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
};

const StatusBadgeSelector: React.FC<StatusBadgeSelectorProps> = ({
  value,
  options,
  onChange,
  stopPropagation = false,
  fullWidth = false,
  size = 'small',
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const selectedOption = options.find((option) => option.value === value) || options[0] || {
    value,
    label: value,
    color: '#6b7280',
  };

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (nextStatus: Order['status']) => {
    handleClose();
    onChange(nextStatus);
  };

  return (
    <>
      <Chip
        label={selectedOption.label}
        clickable
        onClick={handleOpen}
        size={size}
        sx={{
          width: fullWidth ? '100%' : 'auto',
          minWidth: fullWidth ? 150 : 132,
          maxWidth: '100%',
          justifyContent: 'center',
          bgcolor: selectedOption.color,
          color: '#fff',
          fontWeight: 700,
          borderRadius: 1.5,
          '& .MuiChip-label': {
            display: 'block',
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            px: 1.5,
          },
          '&:hover': {
            bgcolor: selectedOption.color,
            filter: 'brightness(0.96)',
          },
        }}
      />
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === value}
            onClick={() => handleSelect(option.value as Order['status'])}
            sx={{ minWidth: 220 }}
          >
            <Chip
              label={option.label}
              size="small"
              sx={{
                bgcolor: option.color,
                color: '#fff',
                fontWeight: 700,
                minWidth: 140,
                justifyContent: 'center',
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default React.memo(StatusBadgeSelector);
