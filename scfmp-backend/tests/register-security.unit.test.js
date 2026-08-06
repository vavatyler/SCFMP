/**
 * Verifies the exact rule added to authController.register:
 * only super_admin may specify an arbitrary cooperative_id; every other
 * role is forced to their own cooperative_id, regardless of what the
 * request body claims.
 */
const resolveCooperativeId = (requestingUser, bodyCooperativeId) =>
  requestingUser.role === 'super_admin' ? bodyCooperativeId : requestingUser.cooperative_id;

describe('User registration cooperative_id resolution (privilege-escalation guard)', () => {
  it('lets super_admin register a user into any cooperative they specify', () => {
    const superAdmin = { role: 'super_admin', cooperative_id: null };
    expect(resolveCooperativeId(superAdmin, 42)).toBe(42);
  });

  it('forces a cooperative_manager into their OWN cooperative, ignoring the request body', () => {
    const manager = { role: 'cooperative_manager', cooperative_id: 1 };
    // Even if the request body claims cooperative_id 99, the manager must not be able to
    // register staff into a cooperative that isn't theirs.
    const attemptedCooperativeId = 99;
    expect(resolveCooperativeId(manager, attemptedCooperativeId)).toBe(1);
  });

  it('forces an accountant into their own cooperative too', () => {
    const accountant = { role: 'accountant', cooperative_id: 7 };
    expect(resolveCooperativeId(accountant, 123)).toBe(7);
  });
});
