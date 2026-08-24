# Gupshup OTP Integration

## Role
Gupshup is the **primary and exclusive** OTP provider for the TechArtha platform. 

## Responsibilities
- New user signup OTP verification
- Existing user login authentication
- Rate limiting and attempt tracking
- Expiry handling

## Architecture
- TechArtha Backend → Gupshup SMS Gateway API → User
- **Strictly Server-Side:** Frontend React Native app never communicates with Gupshup.
- **Provider Interface:** Implemented via `GupshupOtpProvider` inside `otp.provider.ts`.

## Environment Variables
```env
GUPSHUP_USER_ID=
GUPSHUP_PASSWORD=
```
*(No other variables should be added unless explicitly mandated by Gupshup's official documentation for our enterprise account.)*
