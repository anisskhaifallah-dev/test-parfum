export type Locale = 'en' | 'fr' | 'ar';

const STORAGE_KEY = 'yy-parfums-locale';
const RTL_LOCALES: Locale[] = ['ar'];

// Flat "namespace.key" -> string per locale. Product/pack data itself (name, blurb,
// family notes, size labels) is never translated here - it comes from the backend as
// authored by staff and stays in its original (Latin) script regardless of UI language.
const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    'nav.forHer': 'For Her',
    'nav.forHim': 'For Him',
    'nav.packs': 'Packs',
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.wishlist': 'Wishlist',
    'nav.cart': 'Cart',
    'nav.toggleNavigation': 'Toggle navigation',
    'nav.mobileNavigation': 'Mobile bottom navigation',

    'footer.companyInfo': 'Company Info',
    'footer.ourStory': 'Our Story',
    'footer.fragranceJournal': 'Fragrance Journal',
    'footer.helpSupport': 'Help & Support',
    'footer.shippingInfo': 'Shipping Info',
    'footer.howToOrder': 'How to Order',
    'footer.customerCare': 'Customer Care',
    'footer.contactUs': 'Contact Us',
    'footer.cashOnDelivery': 'Cash on Delivery',
    'footer.newsletterTitle': 'Sign Up for New Scent Drops',
    'footer.emailPlaceholder': 'Enter Email',
    'footer.emailAriaLabel': 'Email address',
    'footer.copyright': '© 2026 YY Parfums. All rights reserved.',

    'newsletter.submitting': 'Submitting...',
    'newsletter.success': 'Thanks for subscribing!',
    'newsletter.error': 'Something went wrong. Please try again.',
    'newsletter.invalidEmail': 'Please enter a valid email address.',

    'home.shopForHer': 'Shop For Her',
    'home.shopForHim': 'Shop For Him',
    'home.packsBlurb': 'Two or three 10ml decants bundled together, at a better price than buying them apart.',
    'home.seeAllPacks': 'See All Packs',

    'cart.title': 'Your Cart',
    'cart.emptyText': 'Your cart is empty.',
    'cart.shopFragrances': 'Shop Fragrances',
    'cart.subtotal': 'Subtotal',
    'cart.codNote': 'Payment is Cash on Delivery. Our team confirms every order by phone before it ships.',
    'cart.proceedToCheckout': 'Proceed to Checkout',
    'cart.placingOrder': 'Placing order...',
    'cart.placeOrder': 'Place Order (Cash on Delivery)',
    'cart.genericError': 'Could not place order. Please try again.',
    'cart.thanksTitle': 'Thanks! Your order is in.',
    'cart.thanksBody': 'Our team will call you shortly to confirm the details. Payment is Cash on Delivery.',
    'cart.remove': 'Remove',
    'cart.packLabel': 'Pack',
    'cart.each': 'each',

    'form.fullName': 'Full name',
    'form.phone': 'Phone number',
    'form.address': 'Address',
    'form.aptOptional': 'Apt / building (optional)',
    'form.city': 'City',
    'form.country': 'Country',
    'form.notesOptional': 'Notes (optional)',

    'wishlist.title': 'Your Wishlist',
    'wishlist.emptyText': 'Nothing saved yet.',

    'search.title': 'Search',
    'search.placeholder': 'Search by name or family (e.g. Floral, Oud, For Him)',
    'search.prompt': 'Type a fragrance name or family to search.',
    'search.noResults': 'No fragrances match "{{query}}".',
    'search.resultsCountOne': '{{count}} result for "{{query}}"',
    'search.resultsCountOther': '{{count}} results for "{{query}}"',

    'packs.title': 'Packs',
    'packs.countOne': '{{count}} pack',
    'packs.countOther': '{{count}} packs',

    'category.titleHer': 'For Her',
    'category.blurbHer': 'Fragrances chosen for her, in full bottle or decant.',
    'category.titleHim': 'For Him',
    'category.blurbHim': 'Fragrances chosen for him, in full bottle or decant.',
    'category.countOne': '{{count}} fragrance',
    'category.countOther': '{{count}} fragrances',

    'product.notFound': "We couldn't find that fragrance.",
    'product.backToShop': 'Back to Shop',
    'product.eauDeParfum': 'Eau de Parfum',
    'product.addToCart': 'Add to Cart',
    'product.outOfStock': 'Out of Stock',
    'product.currentlyUnavailable': 'Currently unavailable',
    'product.addedToCart': 'Added to cart.',
    'product.toggleWishlist': 'Toggle wishlist',
    'product.youMayAlsoLike': 'You May Also Like',
    'product.from': 'From',
    'product.unavailableBadge': 'Unavailable',
    'product.addPackToCart': 'Add Pack to Cart',
    'product.added': 'Added!',

    'family.Floral': 'Floral',
    'family.Woody': 'Woody',
    'family.Oriental': 'Oriental',
    'family.Fresh': 'Fresh',
    'family.Gourmand': 'Gourmand',
    'family.Citrus': 'Citrus',

    'switcher.changeLanguage': 'Change language',

    'title.home': 'YY Parfums | Discover Your Signature Scent',
    'title.cart': 'Your Cart | YY Parfums',
    'title.wishlist': 'Your Wishlist | YY Parfums',
    'title.search': 'Search | YY Parfums',
    'title.packs': 'Packs | YY Parfums',
    'title.forHim': 'For Him | YY Parfums',
    'title.forHer': 'For Her | YY Parfums',
    'title.product': 'Fragrance Details | YY Parfums',
  },
  fr: {
    'nav.forHer': 'Pour Elle',
    'nav.forHim': 'Pour Lui',
    'nav.packs': 'Packs',
    'nav.home': 'Accueil',
    'nav.search': 'Recherche',
    'nav.wishlist': 'Favoris',
    'nav.cart': 'Panier',
    'nav.toggleNavigation': 'Basculer la navigation',
    'nav.mobileNavigation': 'Navigation mobile inférieure',

    'footer.companyInfo': 'À propos',
    'footer.ourStory': 'Notre histoire',
    'footer.fragranceJournal': 'Journal olfactif',
    'footer.helpSupport': 'Aide & Support',
    'footer.shippingInfo': 'Informations de livraison',
    'footer.howToOrder': 'Comment commander',
    'footer.customerCare': 'Service client',
    'footer.contactUs': 'Nous contacter',
    'footer.cashOnDelivery': 'Paiement à la livraison',
    'footer.newsletterTitle': 'Inscrivez-vous aux nouveautés',
    'footer.emailPlaceholder': 'Entrez votre email',
    'footer.emailAriaLabel': 'Adresse email',
    'footer.copyright': '© 2026 YY Parfums. Tous droits réservés.',

    'newsletter.submitting': 'Envoi en cours...',
    'newsletter.success': 'Merci pour votre inscription !',
    'newsletter.error': "Une erreur s'est produite. Veuillez réessayer.",
    'newsletter.invalidEmail': 'Veuillez saisir une adresse email valide.',

    'home.shopForHer': 'Découvrir Pour Elle',
    'home.shopForHim': 'Découvrir Pour Lui',
    'home.packsBlurb': 'Deux ou trois décants de 10ml réunis, à un meilleur prix que séparément.',
    'home.seeAllPacks': 'Voir tous les packs',

    'cart.title': 'Votre panier',
    'cart.emptyText': 'Votre panier est vide.',
    'cart.shopFragrances': 'Découvrir les parfums',
    'cart.subtotal': 'Sous-total',
    'cart.codNote': "Le paiement se fait à la livraison. Notre équipe confirme chaque commande par téléphone avant l'expédition.",
    'cart.proceedToCheckout': 'Passer la commande',
    'cart.placingOrder': 'Commande en cours...',
    'cart.placeOrder': 'Commander (Paiement à la livraison)',
    'cart.genericError': 'Impossible de passer la commande. Veuillez réessayer.',
    'cart.thanksTitle': 'Merci ! Votre commande est enregistrée.',
    'cart.thanksBody': 'Notre équipe vous appellera bientôt pour confirmer les détails. Paiement à la livraison.',
    'cart.remove': 'Supprimer',
    'cart.packLabel': 'Pack',
    'cart.each': "l'unité",

    'form.fullName': 'Nom complet',
    'form.phone': 'Numéro de téléphone',
    'form.address': 'Adresse',
    'form.aptOptional': 'Appartement / bâtiment (optionnel)',
    'form.city': 'Ville',
    'form.country': 'Pays',
    'form.notesOptional': 'Remarques (optionnel)',

    'wishlist.title': 'Vos favoris',
    'wishlist.emptyText': "Rien d'enregistré pour l'instant.",

    'search.title': 'Recherche',
    'search.placeholder': 'Rechercher par nom ou famille (ex. Floral, Oud, Pour Lui)',
    'search.prompt': 'Saisissez un nom de parfum ou une famille pour rechercher.',
    'search.noResults': 'Aucun parfum ne correspond à "{{query}}".',
    'search.resultsCountOne': '{{count}} résultat pour "{{query}}"',
    'search.resultsCountOther': '{{count}} résultats pour "{{query}}"',

    'packs.title': 'Packs',
    'packs.countOne': '{{count}} pack',
    'packs.countOther': '{{count}} packs',

    'category.titleHer': 'Pour Elle',
    'category.blurbHer': 'Des parfums choisis pour elle, en flacon complet ou en décant.',
    'category.titleHim': 'Pour Lui',
    'category.blurbHim': 'Des parfums choisis pour lui, en flacon complet ou en décant.',
    'category.countOne': '{{count}} parfum',
    'category.countOther': '{{count}} parfums',

    'product.notFound': "Nous n'avons pas trouvé ce parfum.",
    'product.backToShop': 'Retour à la boutique',
    'product.eauDeParfum': 'Eau de Parfum',
    'product.addToCart': 'Ajouter au panier',
    'product.outOfStock': 'Épuisé',
    'product.currentlyUnavailable': 'Actuellement indisponible',
    'product.addedToCart': 'Ajouté au panier.',
    'product.toggleWishlist': 'Ajouter aux favoris',
    'product.youMayAlsoLike': 'Vous aimerez aussi',
    'product.from': 'Dès',
    'product.unavailableBadge': 'Indisponible',
    'product.addPackToCart': 'Ajouter le pack au panier',
    'product.added': 'Ajouté !',

    'family.Floral': 'Floral',
    'family.Woody': 'Boisé',
    'family.Oriental': 'Oriental',
    'family.Fresh': 'Frais',
    'family.Gourmand': 'Gourmand',
    'family.Citrus': 'Agrumes',

    'switcher.changeLanguage': 'Changer de langue',

    'title.home': 'YY Parfums | Découvrez votre signature olfactive',
    'title.cart': 'Votre panier | YY Parfums',
    'title.wishlist': 'Vos favoris | YY Parfums',
    'title.search': 'Recherche | YY Parfums',
    'title.packs': 'Packs | YY Parfums',
    'title.forHim': 'Pour Lui | YY Parfums',
    'title.forHer': 'Pour Elle | YY Parfums',
    'title.product': 'Détails du parfum | YY Parfums',
  },
  ar: {
    'nav.forHer': 'لها',
    'nav.forHim': 'له',
    'nav.packs': 'الباقات',
    'nav.home': 'الرئيسية',
    'nav.search': 'بحث',
    'nav.wishlist': 'المفضلة',
    'nav.cart': 'السلة',
    'nav.toggleNavigation': 'تبديل التنقل',
    'nav.mobileNavigation': 'التنقل السفلي للجوال',

    'footer.companyInfo': 'معلومات الشركة',
    'footer.ourStory': 'قصتنا',
    'footer.fragranceJournal': 'مجلة العطور',
    'footer.helpSupport': 'المساعدة والدعم',
    'footer.shippingInfo': 'معلومات الشحن',
    'footer.howToOrder': 'كيفية الطلب',
    'footer.customerCare': 'خدمة العملاء',
    'footer.contactUs': 'اتصل بنا',
    'footer.cashOnDelivery': 'الدفع عند الاستلام',
    'footer.newsletterTitle': 'اشترك لمعرفة العطور الجديدة',
    'footer.emailPlaceholder': 'أدخل بريدك الإلكتروني',
    'footer.emailAriaLabel': 'البريد الإلكتروني',
    'footer.copyright': '© 2026 YY Parfums. جميع الحقوق محفوظة.',

    'newsletter.submitting': 'جارٍ الإرسال...',
    'newsletter.success': 'شكرًا لاشتراكك!',
    'newsletter.error': 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    'newsletter.invalidEmail': 'يرجى إدخال بريد إلكتروني صالح.',

    'home.shopForHer': 'تسوقي لها',
    'home.shopForHim': 'تسوق له',
    'home.packsBlurb': 'عبوتان أو ثلاث عبوات 10 مل مجمعة معًا، بسعر أفضل من شرائها منفصلة.',
    'home.seeAllPacks': 'عرض جميع الباقات',

    'cart.title': 'سلتك',
    'cart.emptyText': 'سلتك فارغة.',
    'cart.shopFragrances': 'تسوق العطور',
    'cart.subtotal': 'المجموع الفرعي',
    'cart.codNote': 'الدفع عند الاستلام. يقوم فريقنا بتأكيد كل طلب عبر الهاتف قبل الشحن.',
    'cart.proceedToCheckout': 'المتابعة للدفع',
    'cart.placingOrder': 'جارٍ تقديم الطلب...',
    'cart.placeOrder': 'تأكيد الطلب (الدفع عند الاستلام)',
    'cart.genericError': 'تعذر تقديم الطلب. يرجى المحاولة مرة أخرى.',
    'cart.thanksTitle': 'شكرًا! تم استلام طلبك.',
    'cart.thanksBody': 'سيتصل بك فريقنا قريبًا لتأكيد التفاصيل. الدفع عند الاستلام.',
    'cart.remove': 'إزالة',
    'cart.packLabel': 'باقة',
    'cart.each': 'للقطعة',

    'form.fullName': 'الاسم الكامل',
    'form.phone': 'رقم الهاتف',
    'form.address': 'العنوان',
    'form.aptOptional': 'شقة / مبنى (اختياري)',
    'form.city': 'المدينة',
    'form.country': 'البلد',
    'form.notesOptional': 'ملاحظات (اختياري)',

    'wishlist.title': 'قائمة المفضلة',
    'wishlist.emptyText': 'لا يوجد شيء محفوظ بعد.',

    'search.title': 'بحث',
    'search.placeholder': 'ابحث بالاسم أو العائلة العطرية (مثال: زهري، عود، له)',
    'search.prompt': 'اكتب اسم عطر أو عائلة عطرية للبحث.',
    'search.noResults': 'لا توجد عطور تطابق "{{query}}".',
    'search.resultsCountOne': 'نتيجة واحدة لـ "{{query}}"',
    'search.resultsCountOther': '{{count}} نتيجة لـ "{{query}}"',

    'packs.title': 'الباقات',
    'packs.countOne': 'باقة واحدة',
    'packs.countOther': '{{count}} باقات',

    'category.titleHer': 'لها',
    'category.blurbHer': 'عطور مختارة لها، بزجاجة كاملة أو عبوة عينة.',
    'category.titleHim': 'له',
    'category.blurbHim': 'عطور مختارة له، بزجاجة كاملة أو عبوة عينة.',
    'category.countOne': 'عطر واحد',
    'category.countOther': '{{count}} عطور',

    'product.notFound': 'لم نتمكن من العثور على هذا العطر.',
    'product.backToShop': 'العودة إلى المتجر',
    'product.eauDeParfum': 'Eau de Parfum',
    'product.addToCart': 'أضف إلى السلة',
    'product.outOfStock': 'غير متوفر',
    'product.currentlyUnavailable': 'غير متوفر حاليًا',
    'product.addedToCart': 'تمت الإضافة إلى السلة.',
    'product.toggleWishlist': 'إضافة إلى المفضلة',
    'product.youMayAlsoLike': 'قد يعجبك أيضًا',
    'product.from': 'يبدأ من',
    'product.unavailableBadge': 'غير متوفر',
    'product.addPackToCart': 'أضف الباقة إلى السلة',
    'product.added': 'تمت الإضافة!',

    'family.Floral': 'زهري',
    'family.Woody': 'خشبي',
    'family.Oriental': 'شرقي',
    'family.Fresh': 'منعش',
    'family.Gourmand': 'غورماند',
    'family.Citrus': 'حمضي',

    'switcher.changeLanguage': 'تغيير اللغة',

    'title.home': 'YY Parfums | اكتشف عطرك المميز',
    'title.cart': 'سلتك | YY Parfums',
    'title.wishlist': 'قائمة المفضلة | YY Parfums',
    'title.search': 'بحث | YY Parfums',
    'title.packs': 'الباقات | YY Parfums',
    'title.forHim': 'له | YY Parfums',
    'title.forHer': 'لها | YY Parfums',
    'title.product': 'تفاصيل العطر | YY Parfums',
  },
};

// French is the default for first-time visitors (no saved preference yet) - English and
// Arabic are only ever shown once someone has explicitly picked them via the switcher.
let currentLocale: Locale = 'fr';

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'fr' || stored === 'ar') return stored;
  } catch {
    // localStorage unavailable (e.g. private mode) - fall back to French
  }
  return 'fr';
}

export function getLocale(): Locale {
  return currentLocale;
}

export function isRtl(locale: Locale = currentLocale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let str = dictionaries[currentLocale]?.[key] ?? dictionaries.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), String(value));
    }
  }
  return str;
}

function applyDocumentAttributes(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
}

function applyDomTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as string);
  });
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder as string);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel as string));
  });
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore - locale just won't persist across visits
  }
  applyDocumentAttributes(locale);
  applyDomTranslations();
  window.dispatchEvent(new CustomEvent('localechange', { detail: { locale } }));
}

/** Wire this into every customer-facing entry point via utils.docReady - never on staff.html. */
export function initI18n(): void {
  currentLocale = readStoredLocale();
  applyDocumentAttributes(currentLocale);
  applyDomTranslations();
}
