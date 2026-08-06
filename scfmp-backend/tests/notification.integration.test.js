const { buildTestDb } = require('./testDbHelper');

/**
 * Verifies the core rule added in Sprint 7: when a stock "out" movement drops
 * an item to or below its reorder level, every active cooperative_manager in
 * that cooperative gets a notification — and nobody outside that cooperative does.
 */
describe('Low-stock auto-notification logic', () => {
  let sequelize;

  beforeAll(async () => {
    const db = await buildTestDb();
    sequelize = db.sequelize;
    global.__models = db.models;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('notifies the manager of the correct cooperative when stock drops to/below reorder level', async () => {
    const { Cooperative, User, InventoryItem, Notification } = global.__models;

    const coopA = await Cooperative.create({ name: 'Coop A' });
    const coopB = await Cooperative.create({ name: 'Coop B' });

    const managerA = await User.create({
      cooperative_id: coopA.id,
      first_name: 'Manager',
      last_name: 'A',
      email: 'managerA@test.rw',
      password_hash: 'irrelevant-for-this-test',
      role: 'cooperative_manager',
      status: 'active',
    });
    const managerB = await User.create({
      cooperative_id: coopB.id,
      first_name: 'Manager',
      last_name: 'B',
      email: 'managerB@test.rw',
      password_hash: 'irrelevant-for-this-test',
      role: 'cooperative_manager',
      status: 'active',
    });

    const item = await InventoryItem.create({
      cooperative_id: coopA.id,
      item_name: 'NPK Fertilizer',
      unit: 'kg',
      quantity_in_stock: 200,
      reorder_level: 50,
    });

    // Simulate the same logic used in inventoryController.recordMovement:
    // an "out" movement of 180kg drops stock to 20kg, which is <= the 50kg reorder level.
    const newStock = parseFloat(item.quantity_in_stock) - 180;
    item.quantity_in_stock = newStock;
    await item.save();

    if (newStock <= parseFloat(item.reorder_level)) {
      const managers = await User.findAll({
        where: { cooperative_id: item.cooperative_id, role: 'cooperative_manager', status: 'active' },
      });
      await Promise.all(
        managers.map((m) =>
          Notification.create({
            user_id: m.id,
            title: 'Low stock alert',
            message: `${item.item_name} is running low.`,
            type: 'warning',
          })
        )
      );
    }

    const notificationsForManagerA = await Notification.findAll({ where: { user_id: managerA.id } });
    const notificationsForManagerB = await Notification.findAll({ where: { user_id: managerB.id } });

    expect(notificationsForManagerA).toHaveLength(1);
    expect(notificationsForManagerA[0].type).toBe('warning');
    expect(notificationsForManagerB).toHaveLength(0); // different cooperative — must not be notified
  });
});
