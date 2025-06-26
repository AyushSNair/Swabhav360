export type RootStackParamList = {
  Login: undefined;
  ProfileSetup: undefined;
  Inside: undefined;
  // Add other screen types here as needed
};

// This type will be used by useNavigation, Link, ref etc.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
