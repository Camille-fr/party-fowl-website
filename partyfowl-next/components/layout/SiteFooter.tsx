import { loadPartial } from '../../lib/partialLoader';
import VariantSwitch from '../shared/VariantSwitch';

const desktopMarkup = loadPartial('../src/partials/layout/footerdesktop.html');
const mobileMarkup = loadPartial('../src/partials/layout/footermobile.html');

const SiteFooter = () => (
  <div data-role="site-footer" data-layout-managed="next">
    <VariantSwitch desktopHtml={desktopMarkup} mobileHtml={mobileMarkup} />
  </div>
);

export default SiteFooter;
