# Asset Policy

Use repository-owned assets only when their source and license are known. Store editable sources in [`assets/`](../assets/) and runtime files in `frontend/public/`.

## Current references

| Asset | Location | Use |
| --- | --- | --- |
| K Sure logo | `assets/brand/ksure-logo-300w.png` | Repository documentation and prototype branding. |
| Reference screens | `docs/design/screens/` | Visual review and regression baselines. |
| Flow images | `docs/design/flow-*.png` | Root README product overview. |
| PWA icons | `frontend/public/app-icons/` | Browser and installable-app metadata. |

## Before adding an asset

- Record its source, license, and redistribution terms.
- Export an optimized runtime version when it will ship in the frontend.
- Provide meaningful alternative text for content images.
- Avoid embedding credentials, user data, or unlicensed third-party material.
