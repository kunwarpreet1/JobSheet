import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
} from 'react-native';
import VectorIcon from '../components/VectorIcon';
import { useApp } from '../context/AppContext';
import { isTablet, SPACING } from '../styles/theme';

export default function LoginScreen({ onBack }) {
  const { loginByEmployeeId, sendOtp, verifyOtp, navigate } = useApp();

  // Mode: 'LOGIN' | 'ADMIN_SETUP' | 'ADMIN_OTP'
  const [mode, setMode] = useState('LOGIN');

  // Handle hardware back on Login screen: always exit app when in LOGIN mode
  useEffect(() => {
    const handleBack = () => {
      if (mode === 'ADMIN_OTP') {
        setMode('ADMIN_SETUP');
        return true;
      }
      if (mode === 'ADMIN_SETUP') {
        setMode('LOGIN');
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      BackHandler.exitApp();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [mode, onBack]);

  // Employee ID State
  const [employeeId, setEmployeeId] = useState('');
  const [idError, setIdError] = useState('');
  const [idNotFound, setIdNotFound] = useState(false);
  const [idLoading, setIdLoading] = useState(false);

  // Admin Setup State (for 4821 first-time setup)
  const [adminName, setAdminName] = useState('');
  const [adminMobile, setAdminMobile] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminTimer, setAdminTimer] = useState(30);
  const [adminCanResend, setAdminCanResend] = useState(false);
  const timerRef = useRef(null);

  const cleanId = employeeId.replace(/[^0-9]/g, '').slice(0, 4);
  const isValidId = cleanId.length === 4;

  const cleanAdminMobile = adminMobile.replace(/[^0-9]/g, '').slice(0, 10);
  const isValidAdminMobile = cleanAdminMobile.length === 10;

  // Countdown timer for Admin OTP resend
  useEffect(() => {
    if (mode === 'ADMIN_OTP') {
      setAdminTimer(30);
      setAdminCanResend(false);
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setAdminTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setAdminCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  // Handle Employee ID Login
  const handleEmployeeIdLogin = async () => {
    if (!isValidId) {
      setIdError('Please enter a valid 4-digit Employee ID.');
      return;
    }

    setIdError('');
    setIdNotFound(false);
    setIdLoading(true);

    try {
      const res = await loginByEmployeeId(cleanId);
      if (res && res.success) {
        if (cleanId === '4821' && res.needsProfileSetup) {
          // Admin needs first-time setup
          setMode('ADMIN_SETUP');
          return;
        }
        // Direct login handles navigation inside AppContext
      } else {
        setIdNotFound(true);
        setIdError(res?.message || 'Employee ID not found.');
      }
    } catch (err) {
      setIdNotFound(true);
      setIdError(err.message || 'Employee ID not found.');
    } finally {
      setIdLoading(false);
    }
  };

  // Handle Admin Profile Setup -> Send OTP
  const handleAdminSendOtp = async () => {
    if (!adminName.trim()) {
      setIdError('Please enter your full name as Owner/Admin.');
      return;
    }
    if (!isValidAdminMobile) {
      setIdError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIdError('');
    setIdLoading(true);

    try {
      const res = await sendOtp(cleanAdminMobile);
      if (res && res.success) {
        setMode('ADMIN_OTP');
      } else {
        setIdError(res?.message || 'Failed to dispatch verification code.');
      }
    } catch (err) {
      setIdError(err.message || 'Error sending verification code.');
    } finally {
      setIdLoading(false);
    }
  };

  // Handle Admin Verify OTP & Complete Profile in Supabase
  const handleAdminVerifyOtp = async () => {
    const cleanOtp = adminOtp.trim().replace(/[^0-9]/g, '');
    if (cleanOtp.length < 4) {
      setIdError('Please enter the 6-digit verification code.');
      return;
    }

    setIdError('');
    setIdLoading(true);

    try {
      const res = await verifyOtp({
        mobileNumber: cleanAdminMobile,
        otp: cleanOtp,
        name: adminName.trim(),
        isOwnerSetup: true,
        employeeId: '4821',
      });

      if (res && res.success) {
        // Complete login as Owner directly
        await loginByEmployeeId('4821');
      } else {
        setIdError(res?.message || 'Invalid verification code. Please check your notifications.');
      }
    } catch (err) {
      setIdError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIdLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >


        {/* ==================================================== */}
        {/* MODE: ADMIN FIRST-TIME SETUP (4821)                  */}
        {/* ==================================================== */}
        {mode === 'ADMIN_SETUP' ? (
          <View style={styles.formCard}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setMode('LOGIN')}
              activeOpacity={0.7}
            >
              <VectorIcon name="arrow-left" size={16} color="#6366F1" />
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>

            <View style={[styles.iconBox, { backgroundColor: '#F59E0B', alignSelf: 'center' }]}>
              <VectorIcon name="shield" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.titleMobile, { textAlign: 'center', marginTop: 8 }]}>
              Admin Profile Setup
            </Text>
            <Text style={[styles.subtitle, { marginBottom: SPACING.lg }]}>
              Welcome! As this is your first session as Owner (ID 4821), please enter your Name and Mobile Number.
            </Text>

            <Text style={styles.inputLabel}>ADMIN FULL NAME</Text>
            <View style={[styles.inputBox, adminName.trim() ? styles.inputBoxActive : null]}>
              <VectorIcon name="user" size={18} color="#6366F1" />
              <TextInput
                style={styles.textInput}
                value={adminName}
                onChangeText={(t) => {
                  setIdError('');
                  setAdminName(t);
                }}
                placeholder="e.g. Kunwarpreet Singh"
                placeholderTextColor="#94A3B8"
                autoFocus
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>MOBILE NUMBER</Text>
            <View style={[styles.inputBox, cleanAdminMobile ? (isValidAdminMobile ? styles.inputBoxActive : styles.inputBoxError) : null]}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={[styles.textInput, { letterSpacing: 1 }]}
                value={cleanAdminMobile}
                onChangeText={(t) => {
                  setIdError('');
                  setAdminMobile(t);
                }}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {idError ? <Text style={styles.errorText}>{idError}</Text> : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                adminName.trim() && isValidAdminMobile ? styles.primaryBtnActive : styles.primaryBtnDisabled,
              ]}
              onPress={handleAdminSendOtp}
              disabled={!adminName.trim() || !isValidAdminMobile || idLoading}
              activeOpacity={0.8}
            >
              {idLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify Mobile & Save Profile →</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : mode === 'ADMIN_OTP' ? (
          /* ==================================================== */
          /* MODE: ADMIN OTP VERIFICATION VIEW                    */
          /* ==================================================== */
          <View style={styles.formCard}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setMode('ADMIN_SETUP')}
              activeOpacity={0.7}
            >
              <VectorIcon name="arrow-left" size={16} color="#6366F1" />
              <Text style={styles.backText}>Back to Profile Setup</Text>
            </TouchableOpacity>

            <View style={[styles.iconBox, { backgroundColor: '#10B981', alignSelf: 'center' }]}>
              <VectorIcon name="lock" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.titleMobile, { textAlign: 'center', marginTop: 8 }]}>
              Verify Owner Mobile
            </Text>
            <Text style={[styles.subtitle, { marginBottom: SPACING.md }]}>
              We sent a 6-digit verification code to +91 {cleanAdminMobile}. Check your notification in the status bar!
            </Text>

            {/* <View style={styles.notificationNoticeBanner}>
              <VectorIcon name="bell" size={16} color="#6366F1" />
              <Text style={styles.notificationNoticeText}>
                Check the drop-down notification banner at the top of your screen for the code.
              </Text>
            </View> */}

            <Text style={styles.inputLabel}>ENTER 6-DIGIT VERIFICATION CODE</Text>
            <View style={[styles.otpInputBox, idError ? styles.inputBoxError : adminOtp.trim().length >= 4 ? styles.inputBoxActive : null]}>
              <VectorIcon name="lock" size={18} color="#6366F1" />
              <TextInput
                style={styles.otpTextInput}
                value={adminOtp}
                onChangeText={(t) => {
                  setIdError('');
                  setAdminOtp(t);
                }}
                placeholder="• • • • • •"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            {idError ? <Text style={styles.errorText}>{idError}</Text> : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                adminOtp.trim().length >= 4 ? styles.primaryBtnActive : styles.primaryBtnDisabled,
              ]}
              onPress={handleAdminVerifyOtp}
              disabled={adminOtp.trim().length < 4 || idLoading}
              activeOpacity={0.8}
            >
              {idLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify & Access Owner Dashboard →</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              {adminCanResend ? (
                <TouchableOpacity onPress={handleAdminSendOtp} disabled={idLoading} activeOpacity={0.7}>
                  <Text style={styles.resendActiveText}>Didn't receive code? Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendWaitText}>
                  Resend code in <Text style={{ fontWeight: '800', color: '#6366F1' }}>0:{adminTimer < 10 ? `0${adminTimer}` : adminTimer}</Text>
                </Text>
              )}
            </View>
          </View>
        ) : (
          /* ==================================================== */
          /* MODE: STANDARD 4-DIGIT EMPLOYEE ID LOGIN            */
          /* ==================================================== */
          <View style={{ width: '100%', alignItems: 'center' }}>
            {/* Brand Hero Header */}
            <View style={styles.headerWrap}>
              <View style={styles.iconBox}>
                <VectorIcon name="shield" size={34} color="#FFFFFF" />
              </View>
              <Text style={isTablet ? styles.titleTablet : styles.titleMobile}>
                JobSheetFlow
              </Text>
              <Text style={styles.subtitle}>
                Enter your 4-digit Employee ID to access your dashboard
              </Text>
            </View>

            {/* Employee ID Login Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>ENTER EMPLOYEE ID</Text>

              <View
                style={[
                  styles.idInputBox,
                  idError ? styles.inputBoxError : isValidId ? styles.inputBoxActive : null,
                ]}
              >
                <VectorIcon name="user" size={18} color="#6366F1" />
                <TextInput
                  style={styles.idTextInput}
                  value={cleanId}
                  onChangeText={(text) => {
                    setIdError('');
                    setIdNotFound(false);
                    setEmployeeId(text);
                  }}
                  placeholder="Enter Your ID"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                />
              </View>

              {/* ERROR BANNER: Not Found State */}
              {idNotFound ? (
                <View style={styles.notFoundBanner}>
                  <View style={styles.notFoundHeaderRow}>
                    <VectorIcon name="alert" size={16} color="#DC2626" />
                    <Text style={styles.notFoundTitle}>Employee ID not found.</Text>
                  </View>
                  <Text style={styles.notFoundSub}>
                    Don't have an Employee ID? Register with your mobile number to generate one:
                  </Text>
                </View>
              ) : idError ? (
                <Text style={styles.errorText}>{idError}</Text>
              ) : null}

              {/* Login Action Button */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  isValidId ? styles.primaryBtnActive : styles.primaryBtnDisabled,
                ]}
                onPress={handleEmployeeIdLogin}
                disabled={!isValidId || idLoading}
                activeOpacity={0.8}
              >
                {idLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Login</Text>
                )}
              </TouchableOpacity>


              {/* Footer Prompt */}
              <View style={styles.footerWrap}>
                <Text style={styles.footerPromptText}>New employee without an ID?</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIdError('');
                    setIdNotFound(false);
                    navigate('Register');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.footerLinkText}>Register with Mobile Number →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFBF7',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl * 2,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.lg,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
  headerWrap: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    maxWidth: 360,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  titleTablet: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  titleMobile: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: SPACING.sm,
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  notificationNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  notificationNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#3730A3',
    lineHeight: 17,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  idInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    gap: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    gap: 10,
  },
  countryCodeBadge: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  inputBoxActive: {
    borderColor: '#6366F1',
    backgroundColor: '#FFFFFF',
  },
  inputBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  idTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  otpInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 58,
    gap: 12,
  },
  otpTextInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 8,
  },
  notFoundBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  notFoundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notFoundTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  notFoundSub: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
    marginBottom: 10,
  },
  registerBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  registerBannerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryBtn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    height: 50,
  },
  primaryBtnActive: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resendRow: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  resendActiveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6366F1',
  },
  resendWaitText: {
    fontSize: 12,
    color: '#64748B',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 48,
    gap: 10,
  },
  googleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  footerWrap: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    gap: 4,
  },
  footerPromptText: {
    fontSize: 12,
    color: '#64748B',
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6366F1',
  },
});
