# BSE StAR MF API Capability Matrix

| Feature | Endpoint (SOAP/REST) | Authentication | Credentials Required | Request Format | Response Format | UAT | Prod | Our Account Enabled | Implementation Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `/getPassword` | MemberCode, UserID | Password, Passkey | SOAP/XML | String (Encrypted) | ✅ | ✅ | PENDING CONFIRMATION | PENDING | Awaiting local `.env` configuration of Passkey and Password. |
| **Client Registration** | `/MFAPI/CustomerRegistration` | Token | MemberCode, API Key | JSON/XML | JSON/XML | ✅ | ✅ | PENDING CONFIRMATION | NOT STARTED | Required before any orders can be placed. |
| **PAN Search** | `/AOFPanSearch` | Token | MemberCode, UserID | JSON/XML | JSON/XML | ✅ | ✅ | PENDING CONFIRMATION | NOT STARTED | Determines if user exists in BSE system. |
| **Order Entry (Lumpsum)** | `/MFOrder` | Token | MemberCode, UserID | JSON/XML | JSON/XML | ✅ | ✅ | PENDING CONFIRMATION | NOT STARTED | Needs UCC, KYC, Bank verified. |
| **SIP Registration** | `/XSIPOrderEntry` | Token | MemberCode, UserID | JSON/XML | JSON/XML | ✅ | ✅ | PENDING CONFIRMATION | NOT STARTED | XSIP requires Mandate setup. |
| **Mandate Registration** | `/MandateAuth` | Token | MemberCode | JSON/XML | JSON/XML | ✅ | ✅ | PENDING CONFIRMATION | NOT STARTED | NACH/eMandate setup. |
| **Order Status** | `/OrderStatus` | Token | MemberCode | JSON/XML | JSON/XML | ✅ | ✅ | PENDING CONFIRMATION | NOT STARTED | Must poll for allotment and payment success. |
| **Scheme Master** | `bsestarmf.in/SchemeMaster` | N/A | None (Public/FTP) | CSV/TXT | CSV | ✅ | ✅ | PENDING CONFIRMATION | NOT STARTED | Daily fetch required for NAVs. |

*Note: All statuses are currently marked as PENDING until the API credentials (Password & Passkey) are verified in the local environment and the exact enabled API modules for Member `64683` are confirmed.*
