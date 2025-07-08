import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import React, { useState } from "react";
import { FIREBASE_AUTH } from "../../FirebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";


const { height, width } = Dimensions.get("window");

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const auth = FIREBASE_AUTH;

  const signIn = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation will be handled by auth state change in App.tsx
    } catch (error: any) {
      alert("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // The user will be automatically redirected to the profile setup screen
      // due to the auth state change in App.tsx
    } catch (error: any) {
      alert("Signup failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Image
          source={require("../../assets/smi-logo.png")} // 📌 Use the full logo image
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.formContainer}>
          <Text style={styles.loginTitle}>Login</Text>
          <Text style={styles.subText}>Sign in to continue.</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
          />

          {loading && (
            <ActivityIndicator
              size="large"
              color="#000"
              style={{ marginVertical: 10 }}
            />
          )}

          <TouchableOpacity>
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.link}>
              {isSignUp
                ? "Already have an account? Login"
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: isSignUp ? "#34C759" : "#007AFF" },
            ]}
            onPress={isSignUp ? signUp : signIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>
                {isSignUp ? "Sign Up" : "Log In"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  logo: {
    width: "100%",
    height: height * 0.35,
    marginTop: 30,
  },
  formContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: "center",
    marginTop: -20,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#E5F0FF",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: "#000",
    padding: 14,
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    marginTop: 12,
    color: "#888",
  },
});
