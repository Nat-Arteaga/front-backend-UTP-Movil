import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./cssEditarPerfil";

const BASE_URL = "https://front-backend-utp-movil-production.up.railway.app";

export default function EditarPerfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [username, setUsername] = useState(params.username || "");
  const [bio, setBio] = useState(params.bio || "");
  const [carrera, setCarrera] = useState(params.carrera || "");
  const [ciclo, setCiclo] = useState(params.ciclo || "");
  const [genero, setGenero] = useState(params.genero || "");
  const [intereses, setIntereses] = useState(() => {
    try {
      const parsed = JSON.parse(params.intereses || "[]");
      return Array.isArray(parsed) ? parsed.join(", ") : "";
    } catch {
      return params.intereses || "";
    }
  });
  const [perfilPrivado, setPerfilPrivado] = useState(
    params.privado === "true" || false
  );
  const [fotoPerfil, setFotoPerfil] = useState(params.fotoPerfil || null);
  const [guardando, setGuardando] = useState(false);

  // Seleccionar foto desde la galería
  const elegirFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a tu galería para cambiar tu foto de perfil."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setFotoPerfil(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("⚠️ Falta dato", "El nombre de usuario no puede estar vacío");
      return;
    }

    setGuardando(true);

    try {
      const userId = await AsyncStorage.getItem("userId");

      const interesesArray = intereses
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      const body = {
        username: username.trim(),
        bio: bio.trim(),
        carrera: carrera.trim(),
        ciclo: ciclo.trim(),
        genero: genero.trim(),
        intereses: interesesArray,
        privado: perfilPrivado,
      };

      let guardadoEnBackend = false;

      if (userId) {
        try {
          const response = await fetch(`${BASE_URL}/api/perfil/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await response.json();
          if (data.success) {
            guardadoEnBackend = true;
            await AsyncStorage.removeItem("cached_perfil");
          } else {
            console.warn("Backend respondió con error:", data.error);
          }
        } catch (netErr) {
          console.log("Sin conexión al backend, guardando localmente:", netErr.message);
        }
      }

      // Guardar también localmente
      await AsyncStorage.setItem("custom_username", username.trim());
      await AsyncStorage.setItem("custom_bio", bio.trim());
      await AsyncStorage.setItem("perfil_privado", perfilPrivado ? "true" : "false");
      if (fotoPerfil) {
        await AsyncStorage.setItem("foto_perfil", fotoPerfil);
      }

      const msg = guardadoEnBackend
        ? "Perfil actualizado correctamente."
        : "Guardado localmente (sin conexión al servidor).";

      Alert.alert("✅ Perfil guardado", msg, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("⚠️ Error", "No se pudo guardar la información");
    } finally {
      setGuardando(false);
    }
  };

  const inicialUsuario = username ? username.charAt(0).toUpperCase() : "?";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* HEADER FIJO */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Editar perfil</Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleSave}
          disabled={guardando}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.saveText, guardando && styles.saveTextDisabled]}>
            {guardando ? "Guardando..." : "Guardar"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* FOTO DE PERFIL */}
          <View style={styles.fotoSection}>
            <TouchableOpacity onPress={elegirFoto} style={styles.fotoWrapper}>
              {fotoPerfil ? (
                <Image source={{ uri: fotoPerfil }} style={styles.fotoImg} />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <Text style={styles.fotoInicial}>{inicialUsuario}</Text>
                </View>
              )}
              <View style={styles.fotoEditBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.fotoLabel}>Cambiar foto de perfil</Text>
          </View>

          <View style={styles.form}>
            {/* Nombre de usuario */}
            <Text style={styles.label}>Nombre de usuario</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="at-outline" size={18} color="#555" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={username}
                onChangeText={setUsername}
                placeholder="Nombre de usuario"
                placeholderTextColor="#444"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Biografía */}
            <Text style={styles.label}>Biografía</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Escribe algo sobre ti..."
              placeholderTextColor="#444"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="next"
              blurOnSubmit={false}
            />

            {/* Género */}
            <Text style={styles.label}>Género</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="male-female-outline" size={18} color="#555" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={genero}
                onChangeText={setGenero}
                placeholder="Ej: Masculino, Femenino, No binario..."
                placeholderTextColor="#444"
                returnKeyType="next"
              />
            </View>

            {/* Carrera */}
            <Text style={styles.label}>Carrera</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="school-outline" size={18} color="#555" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={carrera}
                onChangeText={setCarrera}
                placeholder="Ej: Ingeniería de Sistemas"
                placeholderTextColor="#444"
                returnKeyType="next"
              />
            </View>

            {/* Ciclo */}
            <Text style={styles.label}>Ciclo</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={18} color="#555" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={ciclo}
                onChangeText={setCiclo}
                placeholder="Ej: 5to Ciclo"
                placeholderTextColor="#444"
                returnKeyType="next"
              />
            </View>

            {/* Intereses */}
            <Text style={styles.label}>Intereses</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={intereses}
              onChangeText={setIntereses}
              placeholder="Ej: Programación, Diseño, Gaming"
              placeholderTextColor="#444"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              blurOnSubmit={false}
              scrollEnabled={false}
            />
            <Text style={styles.hintText}>Separa los intereses con comas</Text>

            {/* PRIVACIDAD */}
            <View style={styles.separador} />
            <Text style={styles.seccionTitulo}>PRIVACIDAD</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Ionicons
                  name={perfilPrivado ? "lock-closed-outline" : "earth-outline"}
                  size={20}
                  color={perfilPrivado ? "#E60023" : "#30D158"}
                />
                <View style={styles.switchTextos}>
                  <Text style={styles.switchLabel}>
                    {perfilPrivado ? "Perfil privado" : "Perfil público"}
                  </Text>
                  <Text style={styles.switchDesc}>
                    {perfilPrivado
                      ? "Solo se muestra tu usuario y carrera"
                      : "Todo tu perfil es visible para todos"}
                  </Text>
                </View>
              </View>
              <Switch
                value={perfilPrivado}
                onValueChange={setPerfilPrivado}
                trackColor={{ false: "#333", true: "#E60023" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
