import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { QrGenerator } from '@/components/tools/qr-generator';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'QR Code Generator – Create QR Codes Free',
  description:
    'Create a QR code for any URL or text and download it as PNG or SVG. Free, no account, no watermark, no expiry on generated codes.',
  path: '/qr-code-generator',
  ogTitle: 'Free QR Code Generator — Zurl',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'Is this QR code generator free?',
    answer:
      'Yes. Generating and downloading codes is free, requires no account, and adds no watermark. The codes are plain image files that belong to you.',
  },
  {
    question: 'Do the QR codes expire?',
    answer:
      'No. A QR code is a static image encoding your content directly — there is no Zurl redirect involved unless you deliberately encode a Zurl short link. The downloaded image will keep working forever, entirely independently of this site.',
  },
  {
    question: 'Should I download PNG or SVG?',
    answer:
      'PNG for screens, email and most everyday use. SVG for print: it is a vector format, so it stays perfectly sharp at any size, from a business card to a billboard. A PNG scaled up becomes blurry, and blurry edges reduce scan reliability.',
  },
  {
    question: 'What is error correction and which level should I pick?',
    answer:
      'Error correction adds redundancy so a partly damaged or obscured code still scans. Medium (about 15% recovery) is the right default. Choose High if the code will be printed somewhere it may be scuffed or partly covered — bearing in mind that higher levels make the code denser for the same content.',
  },
  {
    question: 'Why does my code look more complex with longer text?',
    answer:
      'More data requires more modules — the individual squares. At a fixed printed size, more modules means smaller squares, which are harder for a camera to resolve. This is the main reason to encode a short link rather than a long URL.',
  },
  {
    question: 'Can I change what a QR code points to after printing it?',
    answer:
      'Not if you encode the destination directly, because the image is fixed. If you encode a Zurl short link instead, you can change the destination at any time and every printed code follows the new target.',
  },
  {
    question: 'Why will my QR code not scan?',
    answer:
      'The most common causes are a missing quiet zone (the code needs a blank margin around it, roughly four modules wide), printing it too small for the scanning distance, low contrast, or an inverted colour scheme. Always test the final artwork with more than one phone before printing.',
  },
  {
    question: 'Does Zurl store what I encode?',
    answer:
      'The content is sent to our server to generate the image and is not stored. QR generation is stateless — no record is kept of the codes you create here.',
  },
];

const FEATURES = [
  {
    title: 'PNG and SVG output',
    description: 'Raster for screens, vector for print. Both download instantly, with no watermark.',
  },
  {
    title: 'Four error correction levels',
    description: 'Choose how much damage the code should survive, from about 7% up to about 30%.',
  },
  {
    title: 'Correct quiet zone',
    description:
      'The required blank margin is built into every download, which is the single most common reason codes fail elsewhere.',
  },
  {
    title: 'No account, no expiry',
    description: 'Codes are static images. They work forever and do not depend on Zurl staying up.',
  },
  {
    title: 'Live preview',
    description: 'The code updates as you type, so you can see how content length affects density.',
  },
  {
    title: 'Pairs with short links',
    description: 'Encode a Zurl link to get a sparse, easily scanned code you can repoint later.',
  },
] as const;

export default function QrCodeGeneratorPage() {
  return (
    <ToolPage
      path="/qr-code-generator"
      breadcrumbLabel="QR Code Generator"
      heading="Free QR Code Generator"
      intro="Create a QR code for any URL or text. Download it as a PNG for screens or an SVG for print — free, without an account, and with no watermark."
      appName="Zurl QR Code Generator"
      appDescription="Generates scannable QR codes from any URL or text, downloadable as PNG or SVG."
      tool={<QrGenerator />}
      features={{
        title: 'What you get',
        items: FEATURES,
      }}
      faqs={FAQS}
      body={
        <>
          <h2>Making a QR code that actually scans</h2>
          <p>
            Most QR code failures are print problems rather than encoding problems. Five things
            account for nearly all of them.
          </p>
          <p>
            <strong>Keep the quiet zone.</strong> The blank margin around the code is part of the
            specification, roughly four modules wide. Designers crop it constantly because it looks
            like wasted space; without it, many scanners cannot locate the code at all. Every Zurl
            download includes it.
          </p>
          <p>
            <strong>Print it large enough.</strong> A useful rule is that the code should be at
            least one tenth of the intended scanning distance. About 3cm works at arm&rsquo;s
            length; a poster read from three metres needs something closer to 30cm.
          </p>
          <p>
            <strong>Keep the contrast high.</strong> Dark modules on a light background. Inverted
            codes fail on many scanners, and low-contrast colour pairs fail in poor light.
          </p>
          <p>
            <strong>Use SVG for print.</strong> Vector output stays sharp at any size. Scaling up a
            PNG softens the module edges, and soft edges cost scan reliability.
          </p>
          <p>
            <strong>Test the final artwork.</strong> Not the file on your screen — the printed
            result, with more than one phone, at the distance people will actually use.
          </p>

          <h2>Why shorter content makes a better code</h2>
          <p>
            The amount of data determines the number of modules. A 200-character URL produces a
            dense grid of small squares; a 26-character short link produces a sparse one with large
            squares that a camera resolves easily, especially at an angle or in poor light.
          </p>
          <p>
            This is why QR codes and short links belong together. Create a{' '}
            <Link href="/url-shortener">short link</Link> first, then encode that. You get a
            cleaner, more reliable code — and because the short link is a redirect, you can change
            where it points after the code is printed.
          </p>

          <h2>Static codes and changeable destinations</h2>
          <p>
            A QR code is a static image. The content is baked in, so encoding{' '}
            <code>example.com/spring-2026</code> directly means that URL must work forever, or the
            printed material becomes useless.
          </p>
          <p>
            Encoding a short link moves that decision out of the print run. The image never changes;
            the destination behind it can. For packaging, signage or anything with a long shelf
            life, this is usually the difference between a code that ages well and one that has to
            be reprinted.
          </p>

          <h2>A note on scanning codes you did not make</h2>
          <p>
            A QR code hides its destination completely — you cannot read it without scanning. Most
            phones show the URL before opening it; read that preview, particularly for codes on
            stickers in public places, which are trivially easy to cover with a different one.
          </p>
        </>
      }
    />
  );
}
