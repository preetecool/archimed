import { defineStore } from "pinia";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as updateFirebasePassword,
} from "firebase/auth";
import { useSubscriptionStore } from "./subscription";
import { useCurrentUser } from "vuefire";

export const useUserStore = defineStore("user", {
  state: () => ({
    preferences: {
      language: "fr",
      theme: "light",
      notifications: true,
    },
    medicalLicense: null,
    isLoading: false,
    error: null,
    isInitialized: false,
  }),

  getters: {
    userData() {
      const user = useCurrentUser();
      return user.value;
    },

    userName() {
      const user = this.userData;
      if (!user) return "";
      return user.displayName || user.email?.split("@")[0] || "Utilisateur";
    },

    isAuthenticated() {
      return !!this.userData;
    },

    hasActiveAccess() {
      const subscriptionStore = useSubscriptionStore();
      return subscriptionStore.hasActiveSubscription;
    },

    isOAuthUser() {
      const user = this.userData;
      if (!user) return false;
      return user.providerData.some((provider) => provider.providerId === "google.com");
    },

    isEmailVerified() {
      return this.userData?.emailVerified || false;
    },
  },

  actions: {
    async initializeUser() {
      if (!this.userData || this.isInitialized) return;

      this.isLoading = true;
      this.error = null;

      try {
        this.loadPreferences();

        await this.fetchMedicalLicense();

        const subscriptionStore = useSubscriptionStore();
        await subscriptionStore.initialize();

        this.isInitialized = true;
        return { success: true };
      } catch (error) {
        console.error("Error initializing user:", error);
        this.error = error.message;
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    loadPreferences() {
      try {
        const savedPreferences = localStorage.getItem("userPreferences");
        if (savedPreferences) {
          this.preferences = {
            ...this.preferences,
            ...JSON.parse(savedPreferences),
          };
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    },

    savePreferences() {
      try {
        localStorage.setItem("userPreferences", JSON.stringify(this.preferences));
      } catch (error) {
        console.error("Error saving preferences:", error);
      }
    },

    updatePreferences(newPreferences) {
      this.preferences = {
        ...this.preferences,
        ...newPreferences,
      };
      this.savePreferences();
    },

    async fetchMedicalLicense() {
      if (!this.userData) return null;

      try {
        const tokenResult = await this.userData.getIdTokenResult(true);
        const claims = tokenResult.claims || {};
        this.medicalLicense = claims.medicalLicense || null;
        return this.medicalLicense;
      } catch (error) {
        console.error("Error fetching medical license:", error);
        return null;
      }
    },

    async loginWithEmail(email, password, rememberMe = false) {
      this.isLoading = true;
      this.error = null;

      try {
        const auth = getAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const idToken = await user.getIdToken();
        localStorage.setItem("firebase_token", idToken);
        localStorage.setItem("authVerified", "true");

        await this.initializeUser();

        return { success: true, user };
      } catch (error) {
        console.error("Email login error:", error);
        this.error = this.translateAuthError(error);
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async loginWithGoogle() {
      this.isLoading = true;
      this.error = null;

      try {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        provider.addScope("email");
        provider.addScope("profile");

        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const idToken = await user.getIdToken();
        localStorage.setItem("firebase_token", idToken);
        localStorage.setItem("authVerified", "true");

        await this.initializeUser();

        return { success: true, user };
      } catch (error) {
        console.error("Google login error:", error);
        this.error = this.translateAuthError(error);
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async registerWithEmail(email, password, medicalLicense) {
      this.isLoading = true;
      this.error = null;

      try {
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);

        const idToken = await user.getIdToken();
        localStorage.setItem("firebase_token", idToken);
        localStorage.setItem("authVerified", "true");

        if (medicalLicense) {
          await this.updateLicense(medicalLicense);
        }

        await this.initializeUser();

        return { success: true, user };
      } catch (error) {
        console.error("Registration error:", error);
        this.error = this.translateAuthError(error);
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async registerWithGoogle(medicalLicense) {
      this.isLoading = true;
      this.error = null;

      try {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        provider.addScope("email");
        provider.addScope("profile");

        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const idToken = await user.getIdToken();
        localStorage.setItem("firebase_token", idToken);
        localStorage.setItem("authVerified", "true");

        if (medicalLicense) {
          await this.updateLicense(medicalLicense);
        }

        await this.initializeUser();

        return { success: true, user };
      } catch (error) {
        console.error("Google registration error:", error);
        this.error = this.translateAuthError(error);
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async logout() {
      this.isLoading = true;
      this.error = null;

      try {
        const auth = getAuth();
        await signOut(auth);

        localStorage.removeItem("firebase_token");
        localStorage.removeItem("authVerified");

        if (this.userData?.uid) {
          localStorage.removeItem(`subscription_${this.userData.uid}`);
          localStorage.removeItem(`subscription_${this.userData.uid}_ttl`);
        }

        const subscriptionStore = useSubscriptionStore();
        subscriptionStore.clearSubscriptionData();

        this.$reset();

        return { success: true };
      } catch (error) {
        console.error("Logout error:", error);
        this.error = error.message;
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async resetPassword(email) {
      this.isLoading = true;
      this.error = null;

      try {
        const auth = getAuth();
        await sendPasswordResetEmail(auth, email);
        return { success: true };
      } catch (error) {
        console.error("Password reset error:", error);
        this.error = this.translateAuthError(error);
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async resendVerificationEmail() {
      this.isLoading = true;
      this.error = null;

      try {
        if (!this.userData) {
          throw new Error("User not logged in");
        }

        await sendEmailVerification(this.userData);

        return {
          success: true,
          message: "Email de vérification envoyé. Veuillez vérifier votre boîte de réception.",
        };
      } catch (error) {
        console.error("Error sending verification email:", error);
        this.error = error.message;
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async updateProfile(displayName) {
      this.isLoading = true;
      this.error = null;

      try {
        if (!this.userData) {
          throw new Error("User not logged in");
        }

        await updateFirebaseProfile(this.userData, {
          displayName: displayName,
        });

        return { success: true };
      } catch (error) {
        console.error("Error updating profile:", error);
        this.error = error.message;
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async updatePassword(currentPassword, newPassword) {
      this.isLoading = true;
      this.error = null;

      try {
        if (!this.userData) {
          throw new Error("User not logged in");
        }

        const credential = EmailAuthProvider.credential(this.userData.email, currentPassword);

        await reauthenticateWithCredential(this.userData, credential);

        await updateFirebasePassword(this.userData, newPassword);

        return { success: true, message: "Mot de passe mis à jour avec succès" };
      } catch (error) {
        console.error("Error updating password:", error);

        if (error.code === "auth/wrong-password") {
          this.error = "Mot de passe actuel incorrect";
        } else {
          this.error = error.message;
        }

        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async updateLicense(licenseNumber) {
      this.isLoading = true;
      this.error = null;

      try {
        if (!this.userData) {
          throw new Error("User not logged in");
        }

        const response = await fetch("/api/auth/verify-license", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await this.userData.getIdToken()}`,
          },
          body: JSON.stringify({
            licenseNumber: licenseNumber,
            email: this.userData.email,
            userId: this.userData.uid,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Erreur lors de la mise à jour de la licence");
        }

        await this.userData.getIdToken(true);

        this.medicalLicense = licenseNumber;

        return { success: true, message: "Numéro de licence mis à jour avec succès" };
      } catch (error) {
        console.error("Error updating license:", error);
        this.error = error.message;
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    validatePasswordStrength(password) {
      const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      };

      const score = Object.values(checks).filter(Boolean).length;

      return {
        score,
        strength: score < 2 ? "weak" : score < 4 ? "medium" : "strong",
        checks,
      };
    },

    // Translate Firebase auth errors to user-friendly messages
    translateAuthError(error) {
      const errorMessages = {
        "auth/invalid-email": "Adresse e-mail invalide",
        "auth/user-disabled": "Ce compte a été désactivé",
        "auth/user-not-found": "Email ou mot de passe invalide",
        "auth/wrong-password": "Email ou mot de passe invalide",
        "auth/too-many-requests": "Trop de tentatives de connexion. Veuillez réessayer plus tard",
        "auth/popup-closed-by-user": "Connexion annulée",
        "auth/email-already-in-use": "Cette adresse email est déjà utilisée",
        "auth/weak-password": "Le mot de passe est trop faible. Utilisez au moins 6 caractères",
        "auth/invalid-credential": "Identifiants invalides",
        "auth/network-request-failed": "Erreur de connexion réseau",
      };

      return (
        errorMessages[error.code] ||
        error.message ||
        "Une erreur s'est produite lors de l'authentification"
      );
    },
  },
});
