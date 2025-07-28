export default defineNuxtRouteMiddleware(async (to, from) => {
  if (to.path === "/settings" || to.path === "/login" || to.path === "/register") {
    return;
  }

  const user = useCurrentUser();

  if (!user.value) {
    return;
  }

  try {
    const tokenResult = await user.value.getIdTokenResult(true);
    const claims = tokenResult.claims || {};

    if (!claims.medicalLicense) {
      localStorage.setItem("requiresMedicalLicense", "true");
    } else {
      localStorage.removeItem("requiresMedicalLicense");
    }
  } catch (error) {
    console.error("Error checking medical license:", error);
  }
});
