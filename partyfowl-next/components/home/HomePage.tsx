import SiteHeader from "../layout/SiteHeader";
import SiteFooter from "../layout/SiteFooter";

const HomePage = () => (
  <>
    <SiteHeader />
    <div id="slideSkeleton" className="slide-skeleton" aria-hidden="true">
      <div className="slide-skeleton__content">
        <div className="slide-skeleton__logo" aria-hidden="true">
          <img
            src="/assets/img/home/logo.png"
            alt="Party Fowl logo"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <span className="sr-only">Party Fowl</span>
        <p className="slide-skeleton__title">Get ready!</p>
        <div className="slide-skeleton__pulse">
          <span className="slide-skeleton__dot" aria-hidden="true"></span>
          <span>Express loading...</span>
        </div>
      </div>
    </div>
    <main className="slides-root pf-home" id="slidesRoot" aria-label="Home slides"></main>
    <div className="mobile-dock" aria-label="Quick actions on mobile">
      <div className="mobile-dock-inner">
        <button type="button" className="dock-btn dock-btn--locations" aria-label="Locations">
          <span className="dock-icon" aria-hidden="true"></span>
          <span className="dock-label">Locations</span>
        </button>
        <button type="button" className="dock-btn dock-btn--order" aria-label="Order Now">
          <span className="dock-icon" aria-hidden="true"></span>
          <span className="dock-label">Order Now</span>
        </button>
      </div>
    </div>
    <SiteFooter />
  </>
);

export default HomePage;
