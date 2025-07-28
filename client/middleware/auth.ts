export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = await getCurrentUser();

  if (to.path === "/" || to.path === "/en") {
    return;
  }

  const publicRoutes = ["/login", "/register", "/reset-password"];
  if (publicRoutes.includes(to.path)) {
    return;
  }

  if (!user) {
    return navigateTo({
      path: "login",
      query: {
        redirect: to.fullPath,
      },
    });
  }
});
