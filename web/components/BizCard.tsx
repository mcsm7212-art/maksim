/* eslint-disable @next/next/no-img-element */
// Business card, 3.5 × 2 inches. Front: photo, name, trade, license, rating, phone. Back: QR code to the short address.
export interface CardData {
  name: string; trade: string; who: string; license: string | null; rating: string | null;
  phone: string | null; photo: string | null; accent: string; shortLabel: string; qrSvg: string; scanText: string; bookText: string;
}

export function CardFront({ d }: { d: CardData }) {
  return (
    <div className="bcard front" style={{ ['--acc' as string]: d.accent }}>
      <div className="bc-photo">{d.photo ? <img src={d.photo} alt="" /> : <img src="/silhouette.webp" alt="" className="sil" />}</div>
      <div className="bc-main">
        <div className="bc-trade">{d.trade}</div>
        <div className="bc-name">{d.name}</div>
        <div className="bc-who">{d.who}</div>
        <div className="bc-meta">
          {d.license && <span>CSLB #{d.license}</span>}
          {d.rating && <span>★ {d.rating}</span>}
        </div>
        {d.phone && <div className="bc-phone">{d.phone}</div>}
        <div className="bc-url">{d.shortLabel}</div>
      </div>
      <img className="bc-logo" src="/emblem.png" alt="" />
    </div>
  );
}

export function CardBack({ d }: { d: CardData }) {
  return (
    <div className="bcard back" style={{ ['--acc' as string]: d.accent }}>
      <div className="bc-qr" dangerouslySetInnerHTML={{ __html: d.qrSvg }} />
      <div className="bc-back-text">
        <div className="bc-scan">{d.scanText}</div>
        <div className="bc-book">{d.bookText}</div>
        <div className="bc-url">{d.shortLabel}</div>
        <div className="bc-brand"><img src="/emblem.png" alt="" /> NovaFides</div>
      </div>
    </div>
  );
}
