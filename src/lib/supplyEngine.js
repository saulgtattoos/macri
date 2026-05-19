import { inventoryService, cartService } from './dataService';

// Reorder Point Formula: (avg_weekly_usage / 7) * lead_time_days + safety_stock
const calculateROP = (item) => {
  return (item.avg_weekly_usage / 7) * item.lead_time_days + item.safety_stock;
};

// Step 1: Deduct used supplies from inventory after session finalize
export const deductSupplies = async (sessionItems) => {
  const deducted = [];

  for (const sessionItem of sessionItems) {
    const allItems = await inventoryService.getAll();
    const match = allItems.find(i => i.item_name === sessionItem.item_name);

    if (!match) continue;

    const newQty = Math.max(0, match.current_qty - sessionItem.qty_used);

    await inventoryService.update(match.id, { current_qty: newQty });

    deducted.push({ ...match, current_qty: newQty });
  }

  return deducted;
};

// Step 2: Evaluate each deducted item against its reorder point
export const evaluateReorderPoints = async (deductedItems) => {
  for (const item of deductedItems) {
    const rop = calculateROP(item);

    if (item.current_qty <= rop) {
      await injectCart(item);
    }
  }
};

// Step 3: Inject into cart only if no pending row exists
export const injectCart = async (item) => {
  const allCartItems = await cartService.getAll();
  const alreadyPending = allCartItems.find(
    c => c.inventory_id === item.id && c.status === 'pending'
  );

  if (alreadyPending) return;

  const packsNeeded = Math.ceil(item.safety_stock / item.pack_size) || 1;

  await cartService.create({
    inventory_id: item.id,
    qty_to_order: packsNeeded,
    status: 'pending',
  });
};

// Master function: call this on session finalize
export const finalizeSession = async (sessionItems) => {
  const deducted = await deductSupplies(sessionItems);
  await evaluateReorderPoints(deducted);
};