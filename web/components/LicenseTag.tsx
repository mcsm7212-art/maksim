/**
 * The license line California asks for wherever a contractor is shown: the CSLB number with a link to the state
 * record, or a plain "No contractor license" (such a pro may only take jobs under $1,000).
 */
export default function LicenseTag({ license, tr, className = 'lic-tag' }: { license: string | null | undefined; tr: (s: string) => string; className?: string }) {
  return license
    ? <a className={`${className} ok`} href={`https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${encodeURIComponent(license)}`} target="_blank" rel="noreferrer" title={tr('Open the license record on cslb.ca.gov')}>CSLB #{license} ↗</a>
    : <span className={`${className} none`} title={tr('California law: without a contractor license, only jobs under $1,000 in total (labor and materials), with no permit.')}>{tr('No contractor license · jobs under $1,000')}</span>;
}
