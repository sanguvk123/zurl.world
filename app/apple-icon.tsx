import { ImageResponse } from 'next/og';

/** Apple touch icon, generated so it always matches the brand mark. */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#4DD8C0',
          fontSize: 116,
          fontWeight: 700,
          color: '#06231F',
          fontFamily: 'sans-serif',
        }}
      >
        Z
      </div>
    ),
    size,
  );
}
