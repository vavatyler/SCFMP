/**
 * Tests the core stock arithmetic used by inventoryController.recordMovement:
 * - "in" movements increase stock
 * - "out" movements decrease stock
 * - an "out" movement that would push stock below zero must be rejected
 *
 * This mirrors the controller's logic in isolation, without needing a live DB.
 */
const applyMovement = (currentStock, type, quantity) => {
  const newStock = type === 'in' ? currentStock + quantity : currentStock - quantity;
  if (type === 'out' && newStock < 0) {
    throw new Error('Insufficient stock');
  }
  return newStock;
};

describe('Inventory stock movement arithmetic', () => {
  it('increases stock on an "in" movement', () => {
    expect(applyMovement(100, 'in', 50)).toBe(150);
  });

  it('decreases stock on an "out" movement', () => {
    expect(applyMovement(100, 'out', 30)).toBe(70);
  });

  it('allows an "out" movement that exactly empties stock', () => {
    expect(applyMovement(50, 'out', 50)).toBe(0);
  });

  it('rejects an "out" movement that would push stock negative', () => {
    expect(() => applyMovement(20, 'out', 25)).toThrow('Insufficient stock');
  });
});
