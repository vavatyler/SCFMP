import { useEffect, useState } from 'react';
import { Plus, Loader2, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import ReportActions from '../components/ReportActions';
import {
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  recordInventoryMovement,
} from '../api/inventory';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { useTranslation } from 'react-i18next';

const emptyItemForm = {
  item_name: '',
  category: 'other',
  unit: 'kg',
  reorder_level: '',
  unit_cost: '',
  initial_quantity: '',
};

const CATEGORY_LABELS = {
  seed: 'Seed',
  fertilizer: 'Fertilizer',
  equipment: 'Equipment',
  other: 'Other',
};

const InventoryPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId } = useCooperative();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = creating; object = editing this item
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [itemError, setItemError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [movingItem, setMovingItem] = useState(null);
  const [moveType, setMoveType] = useState('in');
  const [moveQuantity, setMoveQuantity] = useState('');
  const [moveReference, setMoveReference] = useState('');
  const [moveDate, setMoveDate] = useState('');
  const [moveError, setMoveError] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await listInventory(cooperativeScope);
      setItems(data);
    } catch (err) {
      setError('Could not load inventory. Is the backend server running?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeCooperativeId]);

  const isLowStock = (item) =>
    parseFloat(item.quantity_in_stock) <= parseFloat(item.reorder_level);

  const openCreateItemModal = () => {
    setEditingItem(null);
    setItemForm(emptyItemForm);
    setItemError('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item) => {
    setEditingItem(item);
    setItemForm({
      item_name: item.item_name || '',
      category: item.category || 'other',
      unit: item.unit || 'kg',
      reorder_level: item.reorder_level || '',
      unit_cost: item.unit_cost || '',
      initial_quantity: '',
    });
    setItemError('');
    setIsItemModalOpen(true);
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    setItemError('');
    setIsSaving(true);
    try {
      if (editingItem) {
        const { initial_quantity, ...updatable } = itemForm;
        await updateInventoryItem(editingItem.id, updatable);
      } else {
        await createInventoryItem({ ...itemForm, ...cooperativeScope });
      }
      setIsItemModalOpen(false);
      setItemForm(emptyItemForm);
      fetchItems();
    } catch (err) {
      setItemError(
        err.response?.data?.message || `Could not ${editingItem ? 'update' : 'add'} this item.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.item_name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteInventoryItem(item.id);
      fetchItems();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not delete this item.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openMoveModal = (item, type) => {
    setMovingItem(item);
    setMoveType(type);
    setMoveQuantity('');
    setMoveReference('');
    setMoveDate('');
    setMoveError('');
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    setMoveError('');
    setIsSaving(true);
    try {
      await recordInventoryMovement(movingItem.id, {
        type: moveType,
        quantity: moveQuantity,
        reference: moveReference,
        transaction_date: moveDate,
      });
      setMovingItem(null);
      fetchItems();
    } catch (err) {
      setMoveError(err.response?.data?.message || 'Could not record this movement.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title={t('common.inventory')} subtitle={t('modules.inventorySubtitle')}>
      <ReportActions moduleName="inventory" filters={cooperativeScope} />
      <div className="mb-5 flex items-center justify-end">
        <button
          onClick={openCreateItemModal}
          className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading inventory…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-clay">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">
            No inventory items yet — add your first one.
          </div>
        ) : (
          <table className="min-w-[840px] w-full text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">In stock</th>
                <th className="px-5 py-3 font-medium">Reorder level</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {items.map((item) => {
                const low = isLowStock(item);
                return (
                  <tr key={item.id} className="transition-colors hover:bg-sand/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {low && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-clay" />}
                        <span className="font-medium text-ink">{item.item_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </td>
                    <td className="figure px-5 py-3.5">
                      <span className={`font-medium ${low ? 'text-clay' : 'text-ink'}`}>
                        {item.quantity_in_stock} {item.unit}
                      </span>
                      {low && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-clay/10 px-2 py-0.5 text-xs font-medium text-clay">
                          Low stock
                        </span>
                      )}
                    </td>
                    <td className="figure px-5 py-3.5 text-ink-soft">
                      {item.reorder_level} {item.unit}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openMoveModal(item, 'in')}
                          className="focus-ring rounded-lg border border-sand px-3 py-1.5 text-xs font-medium text-forest hover:bg-forest/5"
                        >
                          Stock in
                        </button>
                        <button
                          onClick={() => openMoveModal(item, 'out')}
                          className="focus-ring rounded-lg border border-sand px-3 py-1.5 text-xs font-medium text-clay hover:bg-clay/5"
                        >
                          Stock out
                        </button>
                        <button
                          onClick={() => openEditItemModal(item)}
                          title="Edit item details"
                          className="focus-ring rounded-lg border border-sand p-1.5 text-ink-soft hover:bg-sand/30 hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          disabled={isDeleting}
                          title="Delete item"
                          className="focus-ring rounded-lg border border-sand p-1.5 text-ink-soft hover:bg-clay/10 hover:text-clay disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        title={editingItem ? 'Edit inventory item' : 'Add inventory item'}
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
      >
        <form onSubmit={handleSubmitItem}>
          {itemError && (
            <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
              {itemError}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Item name
            </label>
            <input
              required
              value={itemForm.item_name}
              onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
              placeholder="e.g. NPK Fertilizer"
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Category
              </label>
              <select
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              >
                <option value="seed">Seed</option>
                <option value="fertilizer">Fertilizer</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Unit
              </label>
              <input
                required
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="kg"
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Reorder level
              </label>
              <input
                type="number"
                step="0.01"
                value={itemForm.reorder_level}
                onChange={(e) => setItemForm({ ...itemForm, reorder_level: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Unit cost (RWF)
              </label>
              <input
                type="number"
                step="0.01"
                value={itemForm.unit_cost}
                onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          {!editingItem && (
            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Opening stock (optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={itemForm.initial_quantity}
                onChange={(e) => setItemForm({ ...itemForm, initial_quantity: e.target.value })}
                placeholder="Leave blank to start at 0"
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          )}
          {editingItem && (
            <p className="mb-6 text-xs text-ink-soft">
              Stock quantity isn't edited here — use "Stock in" or "Stock out" on the item to change it.
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving…' : editingItem ? 'Save changes' : 'Add item'}
          </button>
        </form>
      </Modal>

      <Modal
        title={moveType === 'in' ? 'Record stock in' : 'Record stock out'}
        isOpen={!!movingItem}
        onClose={() => setMovingItem(null)}
      >
        {movingItem && (
          <form onSubmit={handleRecordMovement}>
            {moveError && (
              <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
                {moveError}
              </div>
            )}

            <div className="mb-4 rounded-lg bg-sand/30 px-4 py-3">
              <p className="text-xs text-ink-soft">{movingItem.item_name} — current stock</p>
              <p className="figure text-lg font-semibold text-ink">
                {movingItem.quantity_in_stock} {movingItem.unit}
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Movement type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMoveType('in')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    moveType === 'in'
                      ? 'border-forest bg-forest/10 text-forest'
                      : 'border-sand text-ink-soft'
                  }`}
                >
                  Stock in
                </button>
                <button
                  type="button"
                  onClick={() => setMoveType('out')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    moveType === 'out'
                      ? 'border-clay bg-clay/10 text-clay'
                      : 'border-sand text-ink-soft'
                  }`}
                >
                  Stock out
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Quantity ({movingItem.unit})
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={moveQuantity}
                  onChange={(e) => setMoveQuantity(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Date
                </label>
                <input
                  required
                  type="date"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Reference (optional)
              </label>
              <input
                value={moveReference}
                onChange={(e) => setMoveReference(e.target.value)}
                placeholder="e.g. Purchased from AgroSupply Ltd"
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving…' : 'Record movement'}
            </button>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default InventoryPage;
