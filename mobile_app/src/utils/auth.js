import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const STUDENT_ID_KEY = 'student_id';
const USER_NAME_KEY = 'user_name';

export const saveToken = async (token) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const saveStudentId = async (studentId) => {
  await AsyncStorage.setItem(STUDENT_ID_KEY, studentId);
};

export const getStudentId = async () => {
  return await AsyncStorage.getItem(STUDENT_ID_KEY);
};

export const saveUserName = async (name) => {
  await AsyncStorage.setItem(USER_NAME_KEY, name);
};

export const getUserName = async () => {
  return await AsyncStorage.getItem(USER_NAME_KEY);
};

export const clearAuth = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, STUDENT_ID_KEY, USER_NAME_KEY]);
};

export const isLoggedIn = async () => {
  const token = await getToken();
  return token !== null;
};
