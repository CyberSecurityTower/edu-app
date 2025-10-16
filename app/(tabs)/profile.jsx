import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppState } from '../_layout';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';

// --- Reusable Subscription Card Component ---
const SubscriptionCard = ({ subscription }) => {
  // Case 1: User has an active subscription plan
  if (subscription && subscription.plan !== 'Trial' && subscription.status === 'active') {
    const renewalDate = subscription.renewsOn?.toDate(); // Convert Firestore Timestamp to JS Date
    const formattedDate = renewalDate 
      ? renewalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
      : 'N/A';

    return (
      <View style={styles.subscriptionCard}>
        <Text style={styles.subscriptionTextBold}>You are subscribed to the {subscription.plan}.</Text>
        <Text style={styles.subscriptionText}>Renews on {formattedDate}</Text>
        <Pressable style={{ marginTop: 15 }}>
          <Text style={styles.manageLink}>Manage Subscription</Text>
        </Pressable>
      </View>
    );
  }

  // Case 2: User is on a trial period (Default)
  const expiryDate = subscription?.expiresOn?.toDate();
  let daysLeft = 'N/A';
  if (expiryDate) {
    const now = new Date();
    const diffTime = expiryDate - now;
    daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return (
    <View style={styles.subscriptionCard}>
      <Text style={styles.subscriptionText}>
        You have {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in free trial.
      </Text>
      <AnimatedGradientButton
        text="Upgrade Now"
        onPress={() => {}}
        buttonWidth={180}
        buttonHeight={45}
        fontSize={16}
      />
    </View>
  );
};

// --- Reusable MenuItem Component ---
const MenuItem = ({ icon, name, onPress, isLogout = false }) => (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemContent}>
        <FontAwesome5 name={icon} size={18} color={isLogout ? "#EF4444" : "#a7adb8ff"} style={styles.menuIcon} />
        <Text style={[styles.menuText, isLogout && styles.logoutText]}>{name}</Text>
      </View>
      {!isLogout && <FontAwesome5 name="chevron-right" size={16} color="#6B7280" />}
    </Pressable>
);

// --- Main Profile Screen Component ---
export default function ProfileScreen() {
  const { user, setUser } = useAppState();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          await signOut(auth);
          setUser(null);
          router.replace('/(auth)/');
        } 
      }
    ]);
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Guest';
  const avatarUrl = `https://ui-avatars.com/api/?name=${fullName.replace(' ', '+')}&background=3B82F6&color=FFFFFF&size=128&bold=true`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Profile</Text>

        {/* User Info Section */}
        <View style={styles.userInfoContainer}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.userInfoTextContainer}>
            <Text style={styles.userName}>{fullName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Dynamic Subscription Section */}
        <Text style={styles.sectionTitle}>Subscription</Text>
        <SubscriptionCard subscription={user?.subscription} />

        {/* Menu Section */}
        <View style={styles.menuGroup}>
          <MenuItem icon="user-cog" name="Settings" onPress={() => router.push('/(setup)/edit-profile')} />
          <MenuItem icon="question-circle" name="Help & Support" onPress={() => {}} />
          <MenuItem icon="sign-out-alt" name="Log Out" onPress={handleLogout} isLogout={true} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  
  userInfoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  userInfoTextContainer: { marginLeft: 15 },
  userName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  userEmail: { color: '#a7adb8ff', fontSize: 14, marginTop: 4 },

  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  
  subscriptionCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 30 },
  subscriptionText: { color: '#a7adb8ff', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  subscriptionTextBold: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  manageLink: { color: '#3B82F6', fontSize: 15, fontWeight: 'bold' },

  menuGroup: { backgroundColor: '#1E293B', borderRadius: 12, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  menuItemContent: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 25 },
  menuText: { color: 'white', fontSize: 16, marginLeft: 15 },
  logoutText: { color: '#EF4444' },
});