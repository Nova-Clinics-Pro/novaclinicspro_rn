/**
 * Profile Screen
 * Read-only view of user account information
 * Uses /auth/me data to display profile details
 */

import { ProtectedRoute } from '../core/components/ProtectedRoute';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../core/theme/colors';
import { spacing } from '../core/theme/spacing';
import { typography } from '../core/theme/typography';
import { useAuth } from '../features/auth/presentation/hooks/useAuth';
import { isClinicOwner } from '../features/auth/domain/entities/auth.entity';
import { roleLabelsFor } from '../features/auth/domain/roleLabels';
import { t } from '../core/localization';

function ProfileScreen() {
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
          <Text style={styles.errorTitle}>Not Authenticated</Text>
          <Text style={styles.errorMessage}>Please log in to view your profile.</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const roleLabels = roleLabelsFor(t, currentUser);

  const handleLogout = () => {
    router.push('/logout');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="profile-back-button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(currentUser.fullName || currentUser.email || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.fullName}>{currentUser.fullName || currentUser.email}</Text>
          {roleLabels.length > 0 ? <Text style={styles.email}>{roleLabels.join(' · ')}</Text> : null}
        </View>

        {/* Edit Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info.main} />
          <Text style={styles.noticeText}>
            Profile editing will be available in a future update.
          </Text>
        </View>

        {/* Account Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="person-outline" size={20} color={colors.primary.main} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailValue}>{currentUser.fullName}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="mail-outline" size={20} color={colors.primary.main} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{currentUser.email}</Text>
              </View>
            </View>

          </View>
        </View>

        {/* Roles & Access Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Roles & Access</Text>
          <View style={styles.card}>
            {/* Organization Admin Badge */}
            {currentUser.isOrgAdmin && (
              <>
                <View style={styles.detailRow}>
                  <View style={[styles.detailIconContainer, { backgroundColor: colors.warning[50] }]}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.warning.main} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Organization Admin</Text>
                    <Text style={styles.detailValue}>Super Admin access enabled</Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Roles */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="people-outline" size={20} color={colors.primary.main} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t('profileScreen.roles')}</Text>
                <View style={styles.tagsContainer}>
                  {roleLabels.length > 0 ? (
                    roleLabels.map((label) => (
                      <View key={label} style={styles.tag}>
                        <Text style={styles.tagText}>{label}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.detailValueMuted}>{t('profileScreen.noRoles')}</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Current Tenant */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="business-outline" size={20} color={colors.primary.main} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t('profileScreen.currentClinic')}</Text>
                <Text style={currentUser.tenantId ? styles.detailValue : styles.detailValueMuted}>
                  {currentUser.tenantId ? currentUser.clinicName || t('profileScreen.noClinic') : t('profileScreen.noClinic')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Owned Clinics Section (for clinic owners) */}
        {isClinicOwner(currentUser) && currentUser.ownedClinics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owned Clinics</Text>
            <View style={styles.card}>
              {currentUser.ownedClinics.map((clinic, index) => (
                <React.Fragment key={clinic.tenantId}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIconContainer, { backgroundColor: colors.success[50] }]}>
                      <Ionicons name="medical" size={20} color={colors.success.main} />
                    </View>
                    <View style={styles.detailContent}>
                      <View style={styles.clinicNameRow}>
                        <Text style={styles.detailValue}>{clinic.clinicName}</Text>
                        {clinic.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      {!!clinic.city && (
                        <Text style={styles.detailLabel}>{clinic.city}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Permissions Section (collapsed) */}
        {currentUser.permissions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Permissions</Text>
            <View style={styles.card}>
              <View style={styles.permissionsGrid}>
                {currentUser.permissions.slice(0, 6).map((permission) => (
                  <View key={permission} style={styles.permissionItem}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success.main} />
                    <Text style={styles.permissionText}>{permission.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
                {currentUser.permissions.length > 6 && (
                  <Text style={styles.morePermissions}>
                    +{currentUser.permissions.length - 6} more
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            testID="profile-logout-button"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error.main} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorMessage: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  loginButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h2,
    color: colors.common.white,
    fontWeight: '600',
  },
  fullName: {
    ...typography.h5,
    color: colors.text.primary,
  },
  email: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.info.light + '20',
    borderRadius: 8,
    gap: spacing.sm,
  },
  noticeText: {
    ...typography.caption,
    color: colors.info.main,
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle2,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  detailValue: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '500',
  },
  detailValueMuted: {
    ...typography.body2,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: 68, // Align with content after icon
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tag: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  clinicNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryBadge: {
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  primaryBadgeText: {
    ...typography.caption,
    color: colors.success.main,
    fontWeight: '600',
    fontSize: 10,
  },
  permissionsGrid: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  permissionText: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  morePermissions: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.error[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error.light,
  },
  logoutButtonText: {
    ...typography.button,
    color: colors.error.main,
  },
});

/** Authenticated route: anonymous visitors are redirected to /login (backend remains authoritative). */
export default function ProfileScreenGuarded() {
  return (
    <ProtectedRoute>
      <ProfileScreen />
    </ProtectedRoute>
  );
}
