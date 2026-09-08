# Changelog

All notable project changes are recorded here.

## [2.0.0] — 2026-09-07

### Added

- Responsive Norda storefront redesign and original hero asset
- Managed brands and brand catalog filtering
- Expanded customer/shipping profiles
- BDT totals with configurable flat/free delivery
- One-per-order invoice records and printable views
- SSLCOMMERZ sandbox/live configuration, hosted session initiation, callbacks, IPN and validation checks
- Separate payment, invoice and fulfillment states
- Safe unpaid-order cancellation with stock restoration
- Delivered-purchase review verification
- Upload metadata and stricter file validation
- Admin invoice register, expanded dashboard, constrained workflow and protected CSV report
- Unit tests and project/API/architecture/testing documentation

### Changed

- Authentication now defaults to an HTTP-only cookie instead of browser-stored JWTs
- Cart and checkout totals are recalculated from current server prices
- Products use managed brand references while retaining a legacy display snapshot
- Server startup waits for MongoDB and validates security-critical configuration

### Removed

- Tracked environment-like file containing example credentials
- Publicly displayed demo administrator password
- Simulated card-payment option

## [1.0.0]

- Initial storefront and Express/MongoDB foundation.
