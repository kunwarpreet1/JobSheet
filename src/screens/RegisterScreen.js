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

export default function RegisterScreen({ onBack }) {
  const { sendOtp, verifyOtp, loginAfterRegistration, navigate } = useApp();

  // Wizard Steps: 'INPUT' | 'OTP' | 'SUCCESS'
  const [step, setStep] = useState('INPUT');

  // Input Form State
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // OTP State
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);

  // Success State
  const [registeredEmployee, setRegisteredEmployee] = useState(null);

  // Clean Mobile (digits only, max 10 digits)
  const cleanMobile = mobileNumber.replace(/[^0-9]/g, '').slice(0, 10);
  const isValidMobile = cleanMobile.length === 10;
  const isInputFormValid = name.trim().length > 0 && isValidMobile;

  // Handle hardware back on Register screen: step back to INPUT, or back to Login
  useEffect(() => {
    const handleBack = () => {
      if (step === 'OTP') {
        setStep('INPUT');
        return true;
      }
      if (step === 'SUCCESS') {
        handleProceedToDashboard();
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      navigate('Login');
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [step, onBack, registeredEmployee]);

  // Countdown Timer for OTP Resend
  useEffect(() => {
    if (step === 'OTP') {
      setTimer(30);
      setCanResend(false);
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  // 1. Handle Send OTP & Trigger Notification
  const handleSendOtp = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!isValidMobile) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await sendOtp(cleanMobile);
      if (res && res.success) {
        setStep('OTP');
      } else {
        setErrorMsg((res && res.message) || 'Failed to dispatch verification code.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error sending verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await sendOtp(cleanMobile);
      if (res && res.success) {
        setTimer(30);
        setCanResend(false);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrorMsg(res.message || 'Failed to resend code');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error resending OTP');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Verify OTP & Register New Employee
  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim().replace(/[^0-9]/g, '');
    if (cleanOtp.length < 4) {
      setErrorMsg('Please enter the complete verification code.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await verifyOtp({
        mobileNumber: cleanMobile,
        otp: cleanOtp,
        name: name.trim(),
        isOwnerSetup: false,
      });

      if (res && res.success && res.employee) {
        setRegisteredEmployee(res.employee);
        setStep('SUCCESS');
      } else {
        setErrorMsg(res.message || 'Invalid verification code. Please check your notifications.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  // 5. Proceed to Dashboard after reviewing 4-digit ID
  const handleProceedToDashboard = () => {
    if (registeredEmployee) {
      loginAfterRegistration(registeredEmployee);
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
        {/* STEP 3: SUCCESS STATE - Display 4-digit Employee ID  */}
        {/* ==================================================== */}
        {step === 'SUCCESS' && registeredEmployee ? (
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <VectorIcon name="check-circle" size={42} color="#059669" />
            </View>

            <Text style={styles.successTitle}>Registration Successful!</Text>
            <Text style={styles.successSub}>
              Welcome aboard, <Text style={{ fontWeight: '800', color: '#0F172A' }}>{registeredEmployee.name}</Text>!
            </Text>

            <View style={styles.idDisplayBox}>
              <Text style={styles.idDisplayLabel}>YOUR 4-DIGIT EMPLOYEE ID IS:</Text>
              <Text style={styles.idDisplayText}>{registeredEmployee.employeeId}</Text>
              <View style={styles.rolePill}>
                <VectorIcon name="user" size={13} color="#059669" />
                <Text style={styles.rolePillText}>Role: {(registeredEmployee.role || 'employee').toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.noticeBox}>
              <VectorIcon name="alert" size={14} color="#B45309" />
              <Text style={styles.noticeText}>
                Please remember your 4-digit Employee ID ({registeredEmployee.employeeId}). You can use it to login directly next time without OTP.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.proceedBtn}
              onPress={handleProceedToDashboard}
              activeOpacity={0.8}
            >
              <Text style={styles.proceedBtnText}>Proceed to Employee Dashboard →</Text>
            </TouchableOpacity>
          </View>
        ) : step === 'OTP' ? (
          /* ==================================================== */
          /* STEP 2: OTP VERIFICATION VIEW                        */
          /* ==================================================== */
          <View style={styles.formSectionWrap}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep('INPUT')}
              activeOpacity={0.7}
            >
              <VectorIcon name="arrow-left" size={16} color="#6366F1" />
              <Text style={styles.backText}>Back to Information</Text>
            </TouchableOpacity>

            <View style={styles.heroWrap}>
              <View style={[styles.iconBox, { backgroundColor: '#10B981' }]}>
                <VectorIcon name="shield" size={32} color="#FFFFFF" />
              </View>
              <Text style={isTablet ? styles.heroTitleTablet : styles.heroTitleMobile}>
                Verify Mobile Number
              </Text>

            </View>

            <View style={styles.formCard}>


              <Text style={styles.inputLabel}>ENTER 6-DIGIT VERIFICATION CODE</Text>
              <View
                style={[
                  styles.otpInputBox,
                  errorMsg ? styles.inputBoxError : otp.trim().length >= 4 ? styles.inputBoxActive : null,
                ]}
              >
                <VectorIcon name="lock" size={18} color="#6366F1" />
                <TextInput
                  style={styles.otpTextInput}
                  value={otp}
                  onChangeText={(t) => {
                    setErrorMsg('');
                    setOtp(t);
                  }}
                  placeholder="• • • • • •"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              {/* Verify Action Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  otp.trim().length >= 4 ? styles.submitBtnActive : styles.submitBtnDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={otp.trim().length < 4 || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify & Create Account →</Text>
                )}
              </TouchableOpacity>

              {/* Resend OTP Row */}
              <View style={styles.resendRow}>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading} activeOpacity={0.7}>
                    <Text style={styles.resendActiveText}>Didn't receive code? Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendWaitText}>
                    Resend code in <Text style={{ fontWeight: '800', color: '#6366F1' }}>0:{timer < 10 ? `0${timer}` : timer}</Text>
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          /* ==================================================== */
          /* STEP 1: INITIAL REGISTRATION FORM (Name + Mobile)    */
          /* ==================================================== */
          <View style={styles.formSectionWrap}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => (onBack ? onBack() : navigate('Login'))}
              activeOpacity={0.7}
            >
              <VectorIcon name="arrow-left" size={16} color="#6366F1" />
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>

            <View style={styles.heroWrap}>
              <View style={styles.iconBox}>
                <VectorIcon name="user" size={34} color="#FFFFFF" />
              </View>
              <Text style={isTablet ? styles.heroTitleTablet : styles.heroTitleMobile}>
                Create Your Account
              </Text>
              <Text style={styles.heroSubtitle}>
                Register with your Mobile Number to generate your unique 4-digit Employee ID
              </Text>
            </View>

            <View style={styles.formCard}>
              {/* FULL NAME FIELD */}
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View
                style={[
                  styles.inputBox,
                  name.trim() ? styles.inputBoxActive : null,
                ]}
              >
                <VectorIcon name="user" size={18} color="#6366F1" />
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={(t) => {
                    setErrorMsg('');
                    setName(t);
                  }}
                  placeholder="Enter Your Name"
                  placeholderTextColor="#94A3B8"
                  autoFocus
                />
              </View>

              {/* MOBILE NUMBER FIELD (Replacing Email) */}
              <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>MOBILE NUMBER</Text>
              <View
                style={[
                  styles.inputBox,
                  cleanMobile ? (isValidMobile ? styles.inputBoxActive : styles.inputBoxError) : null,
                ]}
              >
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.textInput, { fontSize: 16, letterSpacing: 1 }]}
                  value={cleanMobile}
                  onChangeText={(t) => {
                    setErrorMsg('');
                    setMobileNumber(t);
                  }}
                  placeholder="Enter Your Number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  isInputFormValid ? styles.submitBtnActive : styles.submitBtnDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={!isInputFormValid || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify Mobile & Register →</Text>
                )}
              </TouchableOpacity>



            </View>

            {/* Back to Login link */}
            <View style={styles.footerLinkWrap}>
              <Text style={styles.footerPromptText}>Already have an Employee ID?</Text>
              <TouchableOpacity
                onPress={() => {
                  if (onBack) onBack();
                  else navigate('Login');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLinkAction}>Login with 4-Digit ID →</Text>
              </TouchableOpacity>
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
  formSectionWrap: {
    width: '100%',
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
  heroWrap: {
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
  heroTitleTablet: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  heroTitleMobile: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  phoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  phoneTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
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
  submitBtn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    height: 50,
  },
  submitBtnActive: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitBtnText: {
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
  footerNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 16,
  },
  footerLinkWrap: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    gap: 4,
  },
  footerPromptText: {
    fontSize: 12,
    color: '#64748B',
  },
  footerLinkAction: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6366F1',
  },
  // Success Card Styles
  successCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  idDisplayBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  idDisplayLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1,
    marginBottom: 6,
  },
  idDisplayText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    fontWeight: '600',
  },
  proceedBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#059669',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  proceedBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
