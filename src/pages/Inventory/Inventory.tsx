import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Delete,
  Edit,
  FilterList,
  Inventory,
  LocalShipping,
  ReceiptLong,
  Search,
  Visibility,
  Warning,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Order, OrderPart, Part, StockMovement, TaxonomyNode } from '../../types';
import { inventoryService } from '../../services/inventoryService';
import { taxonomyService } from '../../services/taxonomyService';
import { orderService } from '../../services/orderService';

type PartFormState = {
  partType: 'spare_part' | 'accessory' | 'product';
  name: string;
  partNumber: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  quantity: string;
  minQuantity: string;
  alertThreshold: string;
  notificationsEnabled: boolean;
  wholesalePrice: string;
  unitPrice: string;
  supplier: string;
  description: string;
  location: string;
};

const emptyPartForm: PartFormState = {
  partType: 'spare_part',
  name: '',
  partNumber: '',
  category: '',
  subcategory: '',
  brand: '',
  model: '',
  quantity: '',
  minQuantity: '',
  alertThreshold: '',
  notificationsEnabled: false,
  wholesalePrice: '',
  unitPrice: '',
  supplier: '',
  description: '',
  location: '',
};

const INVENTORY_GRID_PAGE_SIZE_KEY = 'inventory_grid_rows_per_page_v1';
const CUSTOM_SUPPLIERS_STORAGE_KEY = 'inventory_custom_suppliers_v1';
const gridPageSizeOptions = [10, 50, 100];

const getSavedGridPageSize = (key: string) => {
  const value = Number(localStorage.getItem(key));
  return gridPageSizeOptions.includes(value) ? value : 10;
};

const getSavedCustomSuppliers = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_SUPPLIERS_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((supplier): supplier is string => typeof supplier === 'string') : [];
  } catch {
    return [];
  }
};

const getPartDisplayModel = (part: Part) => {
  const brand = part.brand.trim();
  const model = part.model.trim();

  if (!brand) {
    return model;
  }

  if (!model) {
    return brand;
  }

  return model.toLowerCase().includes(brand.toLowerCase()) ? model : `${brand} ${model}`;
};

const InventoryPage: React.FC = () => {
  const [isPartDialogOpen, setIsPartDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isWriteoffDialogOpen, setIsWriteoffDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [partsData, setPartsData] = useState<Part[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [taxonomyNodes, setTaxonomyNodes] = useState<TaxonomyNode[]>([]);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [partForm, setPartForm] = useState<PartFormState>(emptyPartForm);
  const [receiptQuantity, setReceiptQuantity] = useState('');
  const [receiptUnitCost, setReceiptUnitCost] = useState('');
  const [receiptDocumentNumber, setReceiptDocumentNumber] = useState('');
  const [receiptReason, setReceiptReason] = useState('Оприходование на склад');
  const [writeoffQuantity, setWriteoffQuantity] = useState('1');
  const [writeoffReason, setWriteoffReason] = useState('Ручное списание');
  const [writeoffMode, setWriteoffMode] = useState<'manual' | 'order'>('manual');
  const [writeoffOrderId, setWriteoffOrderId] = useState('');
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [saleQuantity, setSaleQuantity] = useState('1');
  const [salePrice, setSalePrice] = useState('');
  const [salePaymentMethod, setSalePaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'installment'>('cash');
  const [rowsPerPage, setRowsPerPage] = useState(() => getSavedGridPageSize(INVENTORY_GRID_PAGE_SIZE_KEY));
  const [customSuppliers, setCustomSuppliers] = useState<string[]>(getSavedCustomSuppliers);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const apiMessage = (error.response?.data as any)?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return fallback;
  };

  const refreshInventory = async () => {
    await taxonomyService.refreshFromApi();
    await inventoryService.refreshFromApi();
    setPartsData(inventoryService.getParts());
    setMovements(inventoryService.getMovements());
    setTaxonomyNodes(taxonomyService.getNodes('inventory'));
    setOrdersData(await orderService.getOrders());
  };

  useEffect(() => {
    void refreshInventory();
  }, []);

  const rootCategories = useMemo(() => taxonomyNodes.filter((node) => !node.parentId), [taxonomyNodes]);
  const getSubcategories = (parentId: string) => taxonomyNodes.filter((node) => node.parentId === parentId);

  const selectedCategoryNode = taxonomyNodes.find((node) => node.id === filterCategory);
  const selectedRootNode = selectedCategoryNode?.parentId
    ? taxonomyNodes.find((node) => node.id === selectedCategoryNode.parentId)
    : selectedCategoryNode;

  const selectedPartRootCategory = rootCategories.find((node) => node.name === partForm.category);
  const availableSubcategories = selectedPartRootCategory
    ? getSubcategories(selectedPartRootCategory.id)
    : [];

  const getAlertThreshold = (part: Part) =>
    typeof part.alertThreshold === 'number' ? part.alertThreshold : part.minQuantity;

  const isPartLowStock = (part: Part) => inventoryService.isLowStock(part);

  const stats = useMemo(
    () => ({
      totalParts: partsData.length,
      lowStockParts: partsData.filter((part) => isPartLowStock(part)).length,
      totalValue: partsData.reduce((sum, part) => sum + part.quantity * (part.wholesalePrice ?? part.unitPrice), 0),
      outOfStockParts: partsData.filter((part) => part.quantity === 0).length,
    }),
    [partsData]
  );

  const lowStockParts = useMemo(() => partsData.filter((part) => isPartLowStock(part)), [partsData]);
  const activeOrders = useMemo(
    () => ordersData.filter((order) => !['completed', 'cancelled'].includes(order.status)),
    [ordersData]
  );
  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...partsData.map((part) => part.supplier.trim()).filter(Boolean),
          ...customSuppliers.map((supplier) => supplier.trim()).filter(Boolean),
        ])
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [partsData, customSuppliers]
  );

  const filteredParts = useMemo(
    () =>
      partsData.filter((part) => {
        const matchesSearch =
          part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.model.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory =
          filterCategory === 'all' ||
          (selectedCategoryNode?.parentId
            ? part.category === selectedRootNode?.name && part.subcategory === selectedCategoryNode.name
            : part.category === selectedCategoryNode?.name);

        let matchesStatus = true;
        if (filterStatus === 'low') {
          matchesStatus = isPartLowStock(part);
        } else if (filterStatus === 'out') {
          matchesStatus = part.quantity === 0;
        } else if (filterStatus === 'normal') {
          matchesStatus = !isPartLowStock(part) && part.quantity > 0;
        }

        return matchesSearch && matchesCategory && matchesStatus;
      }),
    [partsData, searchTerm, filterCategory, filterStatus, selectedCategoryNode, selectedRootNode]
  );

  const categoryStats = useMemo(
    () =>
      rootCategories.map((category) => ({
        category,
        count: partsData.filter((part) => part.category === category.name).length,
        children: getSubcategories(category.id),
      })),
    [partsData, rootCategories, taxonomyNodes]
  );

  const resetPartForm = () => {
    setEditingPartId(null);
    setPartForm(emptyPartForm);
  };

  const rememberSupplier = (supplier: string) => {
    const normalizedSupplier = supplier.trim();

    if (!normalizedSupplier) {
      return;
    }

    setCustomSuppliers((prev) => {
      if (prev.some((item) => item.toLowerCase() === normalizedSupplier.toLowerCase())) {
        return prev;
      }

      const next = [...prev, normalizedSupplier].sort((a, b) => a.localeCompare(b, 'ru'));
      localStorage.setItem(CUSTOM_SUPPLIERS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const openCreatePartDialog = () => {
    setEditingPartId(null);
    setPartForm({
      ...emptyPartForm,
      category: selectedCategoryNode?.parentId ? selectedRootNode?.name || '' : selectedCategoryNode?.name || '',
      subcategory: selectedCategoryNode?.parentId ? selectedCategoryNode.name : '',
    });
    setIsPartDialogOpen(true);
  };

  const openViewDialog = (part: Part) => {
    setSelectedPart(part);
    setIsViewDialogOpen(true);
  };

  const openReceiptDialog = (part: Part) => {
    setSelectedPart(part);
    setReceiptQuantity('');
    setReceiptUnitCost(String((part.wholesalePrice ?? part.unitPrice) || ''));
    setReceiptDocumentNumber('');
    setReceiptReason('Оприходование на склад');
    setIsReceiptDialogOpen(true);
  };

  const openWriteoffDialog = (part: Part, mode: 'manual' | 'order' = 'manual') => {
    setSelectedPart(part);
    setWriteoffMode(mode);
    setWriteoffQuantity('1');
    setWriteoffReason(mode === 'order' ? 'Списание в заказ' : 'Ручное списание');
    setWriteoffOrderId('');
    setIsWriteoffDialogOpen(true);
  };

  const openEditPartDialog = (part: Part) => {
    setEditingPartId(part.id);
    setPartForm({
      partType: 'spare_part',
      name: part.name,
      partNumber: part.partNumber,
      category: part.category,
      subcategory: part.subcategory || '',
      brand: '',
      model: getPartDisplayModel(part),
      quantity: String(part.quantity),
      minQuantity: String(getAlertThreshold(part)),
      alertThreshold: String(getAlertThreshold(part)),
      notificationsEnabled: part.notificationsEnabled ?? true,
      wholesalePrice: String(part.wholesalePrice ?? part.unitPrice),
      unitPrice: String(part.unitPrice),
      supplier: part.supplier,
      description: part.description || '',
      location: part.location,
    });
    setIsViewDialogOpen(false);
    setIsPartDialogOpen(true);
  };

  const handleSavePart = async () => {
    if (!partForm.name.trim() || !partForm.category) {
      toast.error('Заполните обязательные поля');
      return;
    }

    const alertThreshold = Number(partForm.alertThreshold) || 0;
    const supplier = partForm.supplier.trim();

    const payload = {
      partType: 'spare_part' as const,
      name: partForm.name.trim(),
      partNumber: partForm.partNumber.trim() || `AUTO-${Date.now()}`,
      category: partForm.category,
      subcategory: partForm.subcategory || undefined,
      brand: '',
      model: partForm.model.trim(),
      description: partForm.description.trim(),
      quantity: Number(partForm.quantity) || 0,
      minQuantity: alertThreshold,
      alertThreshold,
      notificationsEnabled: partForm.notificationsEnabled,
      wholesalePrice: Number(partForm.wholesalePrice) || Number(partForm.unitPrice) || 0,
      unitPrice: Number(partForm.wholesalePrice) || Number(partForm.unitPrice) || 0,
      supplier,
      supplierContact: '',
      location: partForm.location.trim(),
    };

    try {
      if (editingPartId) {
        await inventoryService.updatePart(editingPartId, payload);
      } else {
        await inventoryService.addPart(payload);
      }

      rememberSupplier(supplier);
      await refreshInventory();
      setIsPartDialogOpen(false);
      resetPartForm();
      toast.success(editingPartId ? 'Запчасть обновлена' : 'Запчасть добавлена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить запчасть'));
    }
  };

  const handleReceiveStock = async () => {
    if (!selectedPart) {
      return;
    }

    const quantity = Number(receiptQuantity);
    const unitCost = Number(receiptUnitCost || selectedPart.wholesalePrice || selectedPart.unitPrice || 0);

    if (!quantity || quantity <= 0) {
      toast.error('Укажите количество для оприходования');
      return;
    }

    await inventoryService.addStock(
      selectedPart.id,
      quantity,
      receiptReason || 'Оприходование на склад',
      'Склад',
      unitCost,
      receiptDocumentNumber || undefined
    );

    if (unitCost > 0 && (selectedPart.wholesalePrice ?? selectedPart.unitPrice) !== unitCost) {
      await inventoryService.updatePart(selectedPart.id, { wholesalePrice: unitCost });
    }

    void refreshInventory();
    setIsReceiptDialogOpen(false);
    toast.success('Поступление по складу сохранено');
  };

  const handleWriteoffStock = async () => {
    if (!selectedPart) {
      return;
    }

    const quantity = Number(writeoffQuantity);
    if (!quantity || quantity <= 0) {
      toast.error('Укажите количество для списания');
      return;
    }

    if (quantity > selectedPart.quantity) {
      toast.error(`Недостаточно остатка. Доступно: ${selectedPart.quantity} шт.`);
      return;
    }

    try {
      if (writeoffMode === 'order') {
        const targetOrder = activeOrders.find((order) => order.id === writeoffOrderId);
        if (!targetOrder) {
          toast.error('Выберите заказ');
          return;
        }

        await inventoryService.registerOutgoingMovement(
          selectedPart.id,
          quantity,
          `Списание в заказ ${targetOrder.orderNumber}`,
          targetOrder.orderNumber,
          'Склад'
        );

        const existingOrderPart = (targetOrder.parts || []).find((part) => part.partId === selectedPart.id);
        const nextParts: OrderPart[] = existingOrderPart
          ? (targetOrder.parts || []).map((part) =>
              part.partId === selectedPart.id
                ? {
                    ...part,
                    quantity: part.quantity + quantity,
                    totalPrice: (part.quantity + quantity) * part.unitPrice,
                  }
                : part
            )
          : [
              ...(targetOrder.parts || []),
              {
                id: `${targetOrder.id}-${selectedPart.id}-${Date.now()}`,
                partId: selectedPart.id,
                quantity,
                unitPrice: selectedPart.unitPrice,
                totalPrice: selectedPart.unitPrice * quantity,
                isUsed: true,
              },
            ];

        await orderService.updateOrder(targetOrder.id, { parts: nextParts });
        toast.success(`Запчасть списана в заказ ${targetOrder.orderNumber}`);
      } else {
        await inventoryService.registerOutgoingMovement(
          selectedPart.id,
          quantity,
          writeoffReason || 'Ручное списание',
          undefined,
          'Склад'
        );
        toast.success('Списание со склада сохранено');
      }

      await refreshInventory();
      setIsWriteoffDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось списать запчасть');
    }
  };

  const openSellDialog = (part: Part) => {
    setSelectedPart(part);
    setSaleQuantity('1');
    setSalePrice(String(part.unitPrice || 0));
    setSalePaymentMethod('cash');
    setIsSellDialogOpen(true);
  };

  const handleSellItem = async () => {
    if (!selectedPart) return;

    const quantity = Number(saleQuantity);
    const price = Number(salePrice);
    if (!quantity || quantity <= 0) {
      toast.error('Укажите количество');
      return;
    }
    if (quantity > selectedPart.quantity) {
      toast.error(`Недостаточно остатка. Доступно: ${selectedPart.quantity} шт.`);
      return;
    }
    if (price < 0 || Number.isNaN(price)) {
      toast.error('Укажите корректную цену');
      return;
    }

    try {
      await inventoryService.registerOutgoingMovement(
        selectedPart.id,
        quantity,
        'Продажа товара',
        undefined,
        'Склад'
      );

      const { cashService } = await import('../../services/cashService');
      await cashService.addOperation({
        type: 'income',
        amount: quantity * price,
        description: `Продажа ${selectedPart.name} (${quantity} шт.)`,
        category: 'Продажа товаров',
        paymentMethod: salePaymentMethod,
        registerType: salePaymentMethod === 'card' ? 'bank_terminal' : salePaymentMethod === 'transfer' ? 'online' : 'cashbox',
        source: 'manual',
        processedBy: 'Склад',
      });

      await refreshInventory();
      setIsSellDialogOpen(false);
      toast.success('Продажа проведена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось провести продажу'));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      await taxonomyService.addNode('inventory', newCategoryName.trim(), newCategoryParentId || null);
      setNewCategoryName('');
      setNewCategoryParentId('');
      await refreshInventory();
      toast.success(newCategoryParentId ? 'Подкатегория добавлена' : 'Категория добавлена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить категорию'));
    }
  };

  const handleStartCategoryEdit = (node: TaxonomyNode) => {
    setEditingCategoryId(node.id);
    setEditingCategoryName(node.name);
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      const node = taxonomyNodes.find((item) => item.id === editingCategoryId);
      if (!node) {
        toast.error('Категория не найдена');
        return;
      }

      const oldName = node.name;
      const nextName = editingCategoryName.trim();
      await taxonomyService.updateNode(node.id, nextName);

      if (node.parentId) {
        const parentNode = taxonomyNodes.find((item) => item.id === node.parentId);
        if (parentNode) {
          const partsToUpdate = partsData.filter(
            (part) => part.category === parentNode.name && part.subcategory === oldName
          );
          await Promise.all(
            partsToUpdate.map((part) => inventoryService.updatePart(part.id, { subcategory: nextName }))
          );
        }
      } else {
        const partsToUpdate = partsData.filter((part) => part.category === oldName);
        await Promise.all(partsToUpdate.map((part) => inventoryService.updatePart(part.id, { category: nextName })));
      }

      setEditingCategoryId('');
      setEditingCategoryName('');
      await refreshInventory();
      toast.success('Категория обновлена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить категорию'));
    }
  };

  const handleDeleteCategory = async (nodeId: string) => {
    try {
      const node = taxonomyNodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      const childNodes = taxonomyNodes.filter((item) => item.parentId === node.id);
      const hasLinkedParts = node.parentId
        ? partsData.some((part) => {
            const parentNode = taxonomyNodes.find((item) => item.id === node.parentId);
            return parentNode
              ? part.category === parentNode.name && part.subcategory === node.name
              : false;
          })
        : partsData.some(
            (part) =>
              part.category === node.name ||
              childNodes.some((child) => part.category === node.name && part.subcategory === child.name)
          );

      if (hasLinkedParts) {
        toast.error('Сначала перенесите или отредактируйте запчасти в этой категории');
        return;
      }

      await taxonomyService.deleteNode(nodeId);
      await refreshInventory();
      toast.success('Категория удалена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось удалить категорию'));
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Название',
      width: 220,
      renderCell: (params) => (
        <Box sx={{ cursor: 'pointer' }}>
          <Typography variant="body2" fontWeight={700}>
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.partNumber}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'category',
      headerName: 'Категория',
      width: 200,
      renderCell: (params) => (
        <Chip
          label={params.row.subcategory ? `${params.value} / ${params.row.subcategory}` : params.value}
          color="primary"
          size="small"
        />
      ),
    },
    {
      field: 'model',
      headerName: 'Модель',
      width: 220,
      valueGetter: (params) => getPartDisplayModel(params.row),
    },
    {
      field: 'quantity',
      headerName: 'Количество',
      width: 130,
      renderCell: (params) => {
        const isLowStock = isPartLowStock(params.row);
        const isOutOfStock = params.value === 0;

        return (
          <Box display="flex" alignItems="center">
            <Typography
              variant="body2"
              color={isOutOfStock ? 'error.main' : isLowStock ? 'warning.main' : 'success.main'}
              fontWeight={700}
            >
              {params.value}
            </Typography>
            {isLowStock && <Warning sx={{ ml: 1, color: 'warning.main', fontSize: 16 }} />}
          </Box>
        );
      },
    },
    {
      field: 'unitPrice',
      headerName: 'Цена',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700}>
          ₽{Number((params.row.wholesalePrice ?? params.value) || 0).toLocaleString('ru-RU')}
        </Typography>
      ),
    },
    { field: 'supplier', headerName: 'Поставщик', width: 160 },
    { field: 'location', headerName: 'Местоположение', width: 160 },
    {
      field: 'actions',
      headerName: 'Действия',
      width: 150,
      sortable: false,
      renderCell: (params: any) => (
        <Box>
          <IconButton size="small" onClick={() => openViewDialog(params.row)}>
            <Visibility />
          </IconButton>
          <IconButton size="small" onClick={() => openWriteoffDialog(params.row, 'manual')} title="Списать">
            <LocalShipping />
          </IconButton>
          <IconButton size="small" onClick={() => openReceiptDialog(params.row)} title="Оприходовать">
            <Add />
          </IconButton>
          <IconButton size="small" onClick={() => openSellDialog(params.row)} title="Продать">
            <ReceiptLong />
          </IconButton>
          <IconButton size="small" onClick={() => openEditPartDialog(params.row)}>
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={async () => {
              await inventoryService.deletePart(params.row.id);
              await refreshInventory();
              toast.success('Запчасть удалена');
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Склад
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Всего запчастей
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {stats.totalParts}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Inventory />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Низкий остаток
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="warning.main">
                      {stats.lowStockParts}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Warning />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Общая стоимость
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      ₽{stats.totalValue.toLocaleString('ru-RU')}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <CheckCircle />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Нет в наличии
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="error.main">
                      {stats.outOfStockParts}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <LocalShipping />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        {lowStockParts.length > 0 && (
          <Grid item xs={12}>
            <Card
              sx={{
                bgcolor: '#fff7ed',
                color: '#7c2d12',
                border: '1px solid #fdba74',
                boxShadow: 'none',
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  ⚠️ Внимание! Низкий остаток запчастей
                </Typography>
                <Grid container spacing={1}>
                  {lowStockParts.map((part) => (
                    <Grid item key={part.id}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          bgcolor: '#ffffff',
                          border: '1px solid',
                          borderColor: '#fb923c',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <Button
                          size="small"
                          onClick={() => openReceiptDialog(part)}
                          sx={{
                            color: '#9a3412',
                            fontWeight: 700,
                            px: 1.5,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#ffedd5' },
                          }}
                        >
                          {`${part.name} (${part.quantity}/${getAlertThreshold(part)})`}
                        </Button>
                        <IconButton
                          size="small"
                          title="Редактировать запчасть"
                          onClick={() => openEditPartDialog(part)}
                          sx={{
                            color: '#c2410c',
                            borderLeft: '1px solid #fed7aa',
                            borderRadius: 0,
                            '&:hover': { bgcolor: '#ffedd5' },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Категории склада
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Быстрый выбор категории и подкатегории для работы по складу.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setIsCategoryDialogOpen(true)}
                sx={{ mb: 2 }}
              >
                Управлять категориями
              </Button>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Button
                  variant={filterCategory === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setFilterCategory('all')}
                  sx={{ justifyContent: 'space-between', px: 2 }}
                >
                  <span>Все категории</span>
                  <strong>{partsData.length}</strong>
                </Button>
                {categoryStats.map((item) => (
                  <Box key={item.category.id}>
                    <Button
                      fullWidth
                      variant={filterCategory === item.category.id ? 'contained' : 'outlined'}
                      onClick={() => setFilterCategory(item.category.id)}
                      sx={{ justifyContent: 'space-between', px: 2 }}
                    >
                      <span>{item.category.name}</span>
                      <strong>{item.count}</strong>
                    </Button>
                    {item.children.length > 0 && (
                      <Box sx={{ mt: 1, ml: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {item.children.map((child) => (
                          <Button
                            key={child.id}
                            size="small"
                            variant={filterCategory === child.id ? 'contained' : 'text'}
                            onClick={() => setFilterCategory(child.id)}
                            sx={{ justifyContent: 'space-between', px: 1.5 }}
                          >
                            <span>{child.name}</span>
                            <strong>
                              {
                                partsData.filter(
                                  (part) => part.category === item.category.name && part.subcategory === child.name
                                ).length
                              }
                            </strong>
                          </Button>
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={9}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Поиск запчастей..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Категория</InputLabel>
                    <Select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      label="Категория"
                    >
                      <MenuItem value="all">Все</MenuItem>
                      {rootCategories.map((category) => [
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>,
                        ...getSubcategories(category.id).map((child) => (
                          <MenuItem key={child.id} value={child.id}>
                            {`${category.name} / ${child.name}`}
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Статус</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Статус"
                    >
                      <MenuItem value="all">Все</MenuItem>
                      <MenuItem value="normal">Норма</MenuItem>
                      <MenuItem value="low">Низкий остаток</MenuItem>
                      <MenuItem value="out">Нет в наличии</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => {
                      setSearchTerm('');
                      setFilterCategory('all');
                      setFilterStatus('all');
                    }}
                  >
                    Сбросить
                  </Button>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button fullWidth variant="contained" startIcon={<Add />} onClick={openCreatePartDialog}>
                    Добавить запчасть
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={filteredParts}
                  columns={columns}
                  pageSize={rowsPerPage}
                  rowsPerPageOptions={gridPageSizeOptions}
                  onPageSizeChange={(value) => {
                    setRowsPerPage(value);
                    localStorage.setItem(INVENTORY_GRID_PAGE_SIZE_KEY, String(value));
                  }}
                  disableSelectionOnClick
                  onRowClick={(params) => openViewDialog(params.row as Part)}
                  sx={{
                    '& .MuiDataGrid-cell': {
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #e0e0e0',
                    },
                    '& .MuiDataGrid-columnSeparator': {
                      display: 'none',
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Последние движения склада
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
                  gap: 1.5,
                }}
              >
                {movements.slice(0, 9).map((movement) => (
                  <Box
                    key={movement.id}
                    sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="subtitle2">{movement.partName}</Typography>
                      <Chip
                        size="small"
                        color={movement.direction === 'out' ? 'error' : 'success'}
                        label={`${movement.direction === 'out' ? '-' : '+'}${movement.quantity}`}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {movement.reason}
                    </Typography>
                    {movement.orderNumber && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Заказ: {movement.orderNumber}
                      </Typography>
                    )}
                    {typeof movement.totalCost === 'number' && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Сумма: {movement.totalCost.toLocaleString('ru-RU')} ₽
                      </Typography>
                    )}
                    {movement.documentNumber && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Документ: {movement.documentNumber}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {movement.createdAt.toLocaleString('ru-RU')}
                    </Typography>
                  </Box>
                ))}
                {movements.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Движений по складу пока нет.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Dialog open={isPartDialogOpen} onClose={() => setIsPartDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingPartId ? 'Редактировать запчасть' : 'Добавить запчасть'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Название *" value={partForm.name} onChange={(e) => setPartForm((prev) => ({ ...prev, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Артикул" value={partForm.partNumber} onChange={(e) => setPartForm((prev) => ({ ...prev, partNumber: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Категория *</InputLabel>
                <Select
                  value={partForm.category}
                  label="Категория *"
                  onChange={(e) =>
                    setPartForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                      subcategory: '',
                    }))
                  }
                >
                  {rootCategories.map((category) => (
                    <MenuItem key={category.id} value={category.name}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!partForm.category || availableSubcategories.length === 0}>
                <InputLabel>Подкатегория</InputLabel>
                <Select
                  value={partForm.subcategory}
                  label="Подкатегория"
                  onChange={(e) => setPartForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                >
                  <MenuItem value="">Без подкатегории</MenuItem>
                  {availableSubcategories.map((subcategory) => (
                    <MenuItem key={subcategory.id} value={subcategory.name}>
                      {subcategory.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Модель" value={partForm.model} onChange={(e) => setPartForm((prev) => ({ ...prev, model: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Количество" type="number" value={partForm.quantity} onChange={(e) => setPartForm((prev) => ({ ...prev, quantity: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Порог уведомления" type="number" value={partForm.alertThreshold} onChange={(e) => setPartForm((prev) => ({ ...prev, alertThreshold: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Оптовая цена, ₽"
                type="number"
                value={partForm.wholesalePrice}
                onChange={(e) => setPartForm((prev) => ({ ...prev, wholesalePrice: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={supplierOptions}
                value={partForm.supplier}
                onChange={(_, value) => setPartForm((prev) => ({ ...prev, supplier: value || '' }))}
                onInputChange={(_, value) => setPartForm((prev) => ({ ...prev, supplier: value }))}
                renderInput={(params) => <TextField {...params} fullWidth label="Поставщик" />}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Локация" value={partForm.location} onChange={(e) => setPartForm((prev) => ({ ...prev, location: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Описание" multiline minRows={2} value={partForm.description} onChange={(e) => setPartForm((prev) => ({ ...prev, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={partForm.notificationsEnabled} onChange={(e) => setPartForm((prev) => ({ ...prev, notificationsEnabled: e.target.checked }))} />}
                label="Участвует в уведомлениях о низком остатке"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPartDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSavePart}>{editingPartId ? 'Сохранить' : 'Добавить'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isCategoryDialogOpen} onClose={() => setIsCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Управление категориями</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Название категории" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Родительская категория</InputLabel>
                <Select value={newCategoryParentId} label="Родительская категория" onChange={(e) => setNewCategoryParentId(e.target.value)}>
                  <MenuItem value="">Корневая категория</MenuItem>
                  {rootCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleCreateCategory}>Добавить категорию</Button>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {rootCategories.map((category) => (
                  <Box key={category.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={editingCategoryId === category.id ? editingCategoryName : category.name}
                        onChange={(e) => {
                          setEditingCategoryId(category.id);
                          setEditingCategoryName(e.target.value);
                        }}
                      />
                      <IconButton size="small" onClick={handleSaveCategoryEdit}><CheckCircle fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteCategory(category.id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCategoryDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Информация о запчасти</DialogTitle>
        <DialogContent>
          {selectedPart && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>{selectedPart.name}</Typography>
                <Typography variant="body2" color="text.secondary">Артикул: {selectedPart.partNumber}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Категория</Typography>
                <Chip label={selectedPart.subcategory ? `${selectedPart.category} / ${selectedPart.subcategory}` : selectedPart.category} color="primary" size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Модель</Typography>
                <Typography variant="body1">{getPartDisplayModel(selectedPart) || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Остаток / порог уведомления</Typography>
                <Typography variant="body1" fontWeight={700}>{selectedPart.quantity} / {getAlertThreshold(selectedPart)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Порог уведомления</Typography>
                <Typography variant="body1" fontWeight={700}>{getAlertThreshold(selectedPart)} {selectedPart.notificationsEnabled === false ? '(отключено)' : ''}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(15,23,42,0.02)' }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Настройка уведомления</Typography>
                  <Typography variant="body2" color="text.secondary">Эта запчасть {selectedPart.notificationsEnabled === false ? 'не участвует' : 'участвует'} в общем уведомлении о низком остатке. Порог срабатывания: {getAlertThreshold(selectedPart)} шт.</Typography>
                  <Button sx={{ mt: 1.5 }} variant="outlined" startIcon={<Edit />} onClick={() => openEditPartDialog(selectedPart)}>Настроить запчасть</Button>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Последние движения</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {movements.filter((movement) => movement.partId === selectedPart.id).slice(0, 5).map((movement) => (
                    <Box key={movement.id} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2">{movement.reason}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{movement.direction === 'out' ? 'Расход' : 'Приход'} • {movement.quantity} шт. • {movement.createdAt.toLocaleString('ru-RU')}</Typography>
                      {typeof movement.totalCost === 'number' && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Сумма: {movement.totalCost.toLocaleString('ru-RU')} ₽
                        </Typography>
                      )}
                      {movement.documentNumber && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Документ: {movement.documentNumber}
                        </Typography>
                      )}
                    </Box>
                  ))}
                  {movements.filter((movement) => movement.partId === selectedPart.id).length === 0 && (
                    <Typography variant="body2" color="text.secondary">Движений по этой позиции пока нет.</Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: 'flex-end',
            '& > :not(style) ~ :not(style)': { ml: 0 },
            '& .MuiButton-root': {
              minHeight: 40,
              minWidth: { xs: '100%', sm: 132 },
              whiteSpace: 'nowrap',
            },
          }}
        >
          {selectedPart && (
            <>
              <Button variant="outlined" startIcon={<Add />} onClick={() => openReceiptDialog(selectedPart)}>
                Оприходовать
              </Button>
              <Button variant="outlined" startIcon={<LocalShipping />} onClick={() => openWriteoffDialog(selectedPart, 'manual')}>
                Списать
              </Button>
              <Button variant="outlined" startIcon={<ReceiptLong />} onClick={() => openWriteoffDialog(selectedPart, 'order')}>
                Списать в заказ
              </Button>
              <Button variant="outlined" startIcon={<ReceiptLong />} onClick={() => openSellDialog(selectedPart)}>
                Продать
              </Button>
              <Button variant="outlined" startIcon={<Edit />} onClick={() => openEditPartDialog(selectedPart)}>
                Редактировать
              </Button>
            </>
          )}
          <Button onClick={() => setIsViewDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isReceiptDialogOpen} onClose={() => setIsReceiptDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Оприходование запчасти</DialogTitle>
        <DialogContent>
          {selectedPart && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {selectedPart.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Текущий остаток: {selectedPart.quantity} шт.
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Количество"
                  type="number"
                  value={receiptQuantity}
                  onChange={(event) => setReceiptQuantity(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Себестоимость за единицу"
                  type="number"
                  value={receiptUnitCost}
                  onChange={(event) => setReceiptUnitCost(event.target.value)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Документ / накладная"
                  value={receiptDocumentNumber}
                  onChange={(event) => setReceiptDocumentNumber(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Основание"
                  value={receiptReason}
                  onChange={(event) => setReceiptReason(event.target.value)}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsReceiptDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleReceiveStock}>
            Сохранить поступление
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isWriteoffDialogOpen} onClose={() => setIsWriteoffDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{writeoffMode === 'order' ? 'Списание в заказ' : 'Списание запчасти'}</DialogTitle>
        <DialogContent>
          {selectedPart && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {selectedPart.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Доступно на складе: {selectedPart.quantity} шт.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Режим</InputLabel>
                  <Select value={writeoffMode} label="Режим" onChange={(event) => setWriteoffMode(event.target.value as 'manual' | 'order')}>
                    <MenuItem value="manual">Ручное списание</MenuItem>
                    <MenuItem value="order">Списание в заказ</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Количество"
                  type="number"
                  value={writeoffQuantity}
                  onChange={(event) => setWriteoffQuantity(event.target.value)}
                />
              </Grid>
              {writeoffMode === 'order' ? (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Заказ</InputLabel>
                    <Select value={writeoffOrderId} label="Заказ" onChange={(event) => setWriteoffOrderId(event.target.value)}>
                      {activeOrders.map((order) => (
                        <MenuItem key={order.id} value={order.id}>
                          {order.orderNumber} · {order.clientName || 'Клиент'} · {order.deviceBrand} {order.deviceModel}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Основание"
                    value={writeoffReason}
                    onChange={(event) => setWriteoffReason(event.target.value)}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsWriteoffDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" color="warning" onClick={handleWriteoffStock}>
            Списать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isSellDialogOpen} onClose={() => setIsSellDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Продажа товара</DialogTitle>
        <DialogContent>
          {selectedPart && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={700}>{selectedPart.name}</Typography>
                <Typography variant="body2" color="text.secondary">Остаток: {selectedPart.quantity} шт.</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Количество" type="number" value={saleQuantity} onChange={(e) => setSaleQuantity(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Цена продажи, ₽" type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Способ оплаты</InputLabel>
                  <Select value={salePaymentMethod} label="Способ оплаты" onChange={(e) => setSalePaymentMethod(e.target.value as any)}>
                    <MenuItem value="cash">Наличные</MenuItem>
                    <MenuItem value="card">Карта</MenuItem>
                    <MenuItem value="transfer">Перевод</MenuItem>
                    <MenuItem value="installment">Рассрочка</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSellDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSellItem}>Продать</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryPage;
