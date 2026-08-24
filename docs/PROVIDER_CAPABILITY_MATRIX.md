# Provider Capability Matrix

| Capability | Cybrilla | ONDC | External Provider | Required? | Available? | Enabled for our account? | UAT available? | Production available? | Documentation | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **App Login OTP** | NOT_AVAILABLE | NOT_AVAILABLE | Gupshup / Twilio | Yes | EXTERNAL_PROVIDER_REQUIRED | PENDING_PROVIDER_CONFIRMATION | Yes | Yes | [Gupshup Docs] | PENDING |
| **KYC (Identity)** | PENDING_PROVIDER_CONFIRMATION | NOT_AVAILABLE | HyperVerge (Fallback) | Yes | PENDING_PROVIDER_CONFIRMATION | - | - | - | - | PENDING |
| **Investor Registration** | AVAILABLE | AVAILABLE | - | Yes | AVAILABLE | PENDING_PROVIDER_CONFIRMATION | Yes | Yes | [Cybrilla/ONDC Docs] | DO NOT IMPLEMENT (BSE removed) |
| **Bank Verification** | PENDING_PROVIDER_CONFIRMATION | NOT_AVAILABLE | - | Yes | - | - | - | - | - | PENDING |
| **Nominee Addition** | PENDING_PROVIDER_CONFIRMATION | NOT_AVAILABLE | - | Yes | - | - | - | - | - | PENDING |
| **Scheme Discovery** | AVAILABLE | AVAILABLE | MFAPI (Reference) | Yes | AVAILABLE_AND_ENABLED | Yes | Yes | Yes | [ONDC Catalog] | PENDING |
| **Lumpsum Order** | AVAILABLE | AVAILABLE | - | Yes | AVAILABLE_AND_ENABLED | PENDING_PROVIDER_CONFIRMATION | Yes | Yes | [ONDC Init/Confirm] | PENDING |
| **SIP Registration** | AVAILABLE | AVAILABLE | - | Yes | AVAILABLE_AND_ENABLED | PENDING_PROVIDER_CONFIRMATION | Yes | Yes | [Cybrilla SIP Docs] | PENDING |
| **Mandate Creation** | AVAILABLE | AVAILABLE | - | Yes | AVAILABLE_AND_ENABLED | PENDING_PROVIDER_CONFIRMATION | Yes | Yes | - | PENDING |
| **Order Status** | AVAILABLE | AVAILABLE | - | Yes | AVAILABLE_AND_ENABLED | PENDING_PROVIDER_CONFIRMATION | Yes | Yes | [ONDC Status] | PENDING |
| **Portfolio/Holdings**| PENDING_PROVIDER_CONFIRMATION | NOT_AVAILABLE | Cybrilla RTA APIs | Yes | PENDING_PROVIDER_CONFIRMATION | - | - | - | - | PENDING |

> **CRITICAL RULE:** Do NOT independently integrate HyperVerge, Gupshup, or BSE unless Cybrilla/ONDC explicitly lacks the capability and it is verified missing from our Cybrilla access scope.
