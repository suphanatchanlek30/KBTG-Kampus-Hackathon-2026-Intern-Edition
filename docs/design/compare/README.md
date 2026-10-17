# Visual Comparisons

Each image contains the implementation, its Figma reference, and a 50% overlay at 393 × 852.

| Landlord | Tenant |
| --- | --- |
| [L1](./L1.jpg) · [L2](./L2.jpg) · [L3](./L3.jpg) · [L4](./L4.jpg) · [L5](./L5.jpg) · [L6](./L6.jpg) | [T1](./T1.jpg) · [T2](./T2.jpg) · [T3](./T3.jpg) · [T4](./T4.jpg) · [T5](./T5.jpg) · [T6](./T6.jpg) · [T7](./T7.jpg) · [T8](./T8.jpg) |

Intentional differences:

- QR patterns encode live invite URLs.
- Screens omit the reference frame's status bar and home indicator on physical devices.
- Money is displayed without a leading currency glyph.

## Refresh checks

```bash
cd frontend
npm run test:visual
```

Review the generated diff before updating a baseline with `npm run test:visual:update`.
