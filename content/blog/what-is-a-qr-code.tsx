import Link from 'next/link';
import type { BlogPost } from './index';

export const post: BlogPost = {
  slug: 'what-is-a-qr-code',
  title: 'What Is a QR Code?',
  seoTitle: 'What Is a QR Code? How They Work and How to Make One',
  description:
    'How QR codes store data, what the patterns in the corners do, why error correction lets damaged codes still scan, and how to make one that works in print.',
  heading: 'What is a QR code?',
  publishedAt: '2026-03-04',
  readingMinutes: 6,
  relatedTools: [
    { path: '/qr-code-generator', label: 'QR Code Generator' },
    { path: '/url-shortener', label: 'URL Shortener' },
  ],
  relatedPosts: ['what-is-a-short-url', 'how-to-shorten-a-url'],
  body: () => (
    <>
      <p>
        A QR code is a two-dimensional barcode that stores data as a grid of black and white
        squares. Point a camera at one and the device reads the pattern back into text — most often
        a URL.
      </p>

      <p>
        &quot;QR&quot; stands for Quick Response. The format was created in 1994 for tracking car
        parts, and is defined by an open standard (ISO/IEC 18004), which is why every phone can read
        one without any particular app.
      </p>

      <h2>How the pattern works</h2>

      <p>Several distinct regions do different jobs.</p>

      <h3>Finder patterns</h3>
      <p>
        The three large squares in the corners. A scanner looks for these first — their 1:1:3:1:1
        ratio of dark to light is rare enough in ordinary images to be a reliable signal. Three
        corners rather than four is what lets a scanner work out the rotation, which is why a QR
        code reads correctly upside down.
      </p>

      <h3>Timing patterns</h3>
      <p>
        The alternating line of squares between the finder patterns. This tells the scanner how
        large each module is, so it can map the image back to a grid even when the photo is taken at
        an angle.
      </p>

      <h3>Format information</h3>
      <p>
        A strip beside the finder patterns recording the error correction level and which mask was
        applied. A scanner reads this before it can interpret anything else.
      </p>

      <h3>Data and error correction</h3>
      <p>
        Everything else. The payload is encoded in a zigzag from the bottom right, interleaved with
        Reed-Solomon error correction codewords.
      </p>

      <h2>Why a damaged code still scans</h2>

      <p>
        Error correction is the property that makes QR codes practical in the physical world. The
        encoded data includes redundancy, so a portion of the code can be missing or obscured and
        the content is still recoverable.
      </p>

      <p>There are four levels:</p>

      <ul>
        <li>
          <strong>L</strong> — recovers about 7% damage
        </li>
        <li>
          <strong>M</strong> — about 15%
        </li>
        <li>
          <strong>Q</strong> — about 25%
        </li>
        <li>
          <strong>H</strong> — about 30%
        </li>
      </ul>

      <p>
        Higher levels need more modules for the same content, making the code denser. Level M is the
        usual default and is what Zurl uses: enough tolerance for a scuffed print, without making
        the code unnecessarily dense. Level H is how logos can be placed over the centre of a code —
        the covered area counts as damage the correction absorbs.
      </p>

      <h2>Masking</h2>
      <p>
        Large blank or solid regions confuse scanners, so the encoder applies one of eight mask
        patterns that flips modules according to a formula. All eight are scored against penalty
        rules and the best is chosen. This is why two codes with nearly identical content can look
        completely different.
      </p>

      <h2>Why shorter content makes a better code</h2>

      <p>
        More data means more modules, and more modules mean smaller squares at any given printed
        size. Small modules are harder to scan — particularly in poor light, at an angle, or from a
        distance.
      </p>

      <p>
        This is the practical reason to combine QR codes with short links. A 200-character URL
        produces a dense code that struggles on a poster; a{' '}
        <Link href="/url-shortener">short link</Link> of around 26 characters produces a sparse one
        that scans quickly from across a room. The short link also lets you change the destination
        later without reprinting anything.
      </p>

      <h2>Making one that actually works</h2>

      <ul>
        <li>
          <strong>Keep the quiet zone.</strong> The blank margin around the code is part of the
          specification — roughly four modules wide. Cropping it is the single most common reason a
          code fails to scan.
        </li>
        <li>
          <strong>Print it large enough.</strong> A rough rule is that the code should be at least
          one tenth of the scanning distance: 3cm for arm&rsquo;s length, considerably larger for a
          wall poster.
        </li>
        <li>
          <strong>Keep the contrast high.</strong> Dark on light. Inverted codes fail on many
          scanners, and low-contrast colour pairs fail in poor lighting.
        </li>
        <li>
          <strong>Use SVG for print.</strong> Vector output stays sharp at any size. A PNG scaled up
          becomes blurry, and blurry edges cost you scan reliability.
        </li>
        <li>
          <strong>Test it before printing.</strong> Scan the final artwork with more than one phone.
          Test at the actual distance people will use.
        </li>
      </ul>

      <h2>A note on safety</h2>

      <p>
        A QR code hides its destination even more thoroughly than a short link — you cannot read it
        at all without scanning. Most phones show the URL before opening it; read that preview,
        particularly for codes on stickers in public places, which are trivial to replace with a
        malicious one.
      </p>

      <h2>Creating one</h2>

      <p>
        The <Link href="/qr-code-generator">QR code generator</Link> produces a code for any URL or
        text, downloadable as PNG or SVG, with no account required.
      </p>
    </>
  ),
};
