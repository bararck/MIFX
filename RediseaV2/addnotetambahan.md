test('should handle unauthorized access', async ({ stakeholderService, authService }) => {
  await authService.logout();
  
  const response: ApiResponse = await stakeholderService.getStakeholders(1, 10);
  
  expect(response.status).toBe(401);
  expect(response.body?.message).toBeDefined();
});