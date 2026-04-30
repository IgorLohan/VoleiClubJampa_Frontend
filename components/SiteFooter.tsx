export type SiteFooterProps = {
  brandName: string;
};

export default function SiteFooter({ brandName }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-inner footer-inner--center">
        <img
          className="footer-brand-image"
          src="/logo/footer.png"
          alt={brandName}
          loading="lazy"
        />
        <div className="footer-copy">
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
