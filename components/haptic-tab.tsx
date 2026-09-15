import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

// Dùng any để tránh xung đột type giữa expo-router và @react-navigation/bottom-tabs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function HapticTab(props: any) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev: any) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
