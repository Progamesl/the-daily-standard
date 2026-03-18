import { Layout } from "@/components/layout/Layout";

const policies = [
  {
    title: "Mission Statement",
    body: "The Octagon is the student-run newspaper of Sacramento Country Day high school. The print edition is published eight times a year, and the website is updated daily. The Octagon is committed to unbiased and comprehensive reporting, serving as a source of reliable information for SCDS students as well as the school and Sacramento community. The Octagon will publish timely and relevant news deemed appropriate by the editors-in-chief and adviser. We seek to highlight school-related events and spotlight the voices of those with a story to share.",
  },
  {
    title: "Editorial Policy",
    body: "Editorials shall be approved by and reflect the opinions of the editorial staff, which includes the editors-in-chief, page editors, section editors and copy editors. Columns and commentaries shall be clearly labeled as such and will represent only the opinions of the authors.\n\nIn the interest of representing all points of view, letters to the editor will be published, space permitting. The editors-in-chief and adviser may reject letters if the content is deemed inappropriate, offensive or false. All letters must be signed and conform to the above restrictions on published material. The staff retains the right to edit letters for grammar, punctuation and space considerations.",
  },
  {
    title: "Corrections Policy",
    body: "The Octagon's policy is to correct factual errors and to clarify potentially confusing statements. Corrections due to significant errors will be noted at the bottom of stories online and will appear on Page 2 of the next print edition. For minor corrections, such as punctuation, the story will be modified online without the publication of any statement at the bottom of the story.",
  },
  {
    title: "Story Removal Policy",
    body: "Following well-established journalism ethics and practices, rarely will The Octagon remove published content. Requests to do so will be reviewed by the editors-in-chief and the adviser. If content information is determined to be inaccurate, in most cases, corrections will be made following the above policy. The editors and the adviser will evaluate requests for any other reasons on a case-by-case basis.",
  },
  {
    title: "Quote Check Policy",
    body: "With the exception of quote checking, The Octagon does not share unpublished content outside the newspaper staff. Stories will not be shared in their entirety with sources before publication. For the sake of accuracy, sources who have been interviewed for a story may ask to have their direct quotations read back to them or the recording of a quotation played back to them. They may not, however, change what they already have said.",
  },
  {
    title: "Comment Policy",
    body: "Respectful comments on stories online are encouraged. All comments are moderated by the online editors-in-chief and the adviser. Remarks containing ad hominem attacks toward the writer will not be posted. We reserve the right to remove any comment the editors-in-chief and adviser deem inappropriate. To make a comment, a valid name and email address are required for confirmation, but the email address will not be displayed on the site.",
  },
];

export default function AboutPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Hero */}
        <div className="border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
            <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">
              Sacramento Country Day School
            </p>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-none mb-6">
              About<br />The Octagon
            </h1>
            <div className="w-12 h-1 bg-slate-900" />
          </div>
        </div>

        {/* Policies */}
        <div className="max-w-4xl mx-auto px-6 py-16 space-y-0 divide-y divide-slate-100">
          {policies.map((policy) => (
            <div key={policy.title} className="py-12 md:grid md:grid-cols-3 md:gap-12">
              <div className="mb-4 md:mb-0">
                <h2 className="font-serif text-xl font-bold text-slate-900 leading-snug">
                  {policy.title}
                </h2>
              </div>
              <div className="md:col-span-2 space-y-4">
                {policy.body.split("\n\n").map((para, i) => (
                  <p key={i} className="text-slate-600 leading-relaxed text-[15px]">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {/* Archives row */}
          <div className="py-12 md:grid md:grid-cols-3 md:gap-12">
            <div className="mb-4 md:mb-0">
              <h2 className="font-serif text-xl font-bold text-slate-900 leading-snug">
                Print Archives
              </h2>
            </div>
            <div className="md:col-span-2">
              <p className="text-slate-600 leading-relaxed text-[15px] mb-5">
                Archives of our print editions are available for the community to browse.
              </p>
              <a
                href="/archives"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 border border-slate-900 px-5 py-2.5 rounded hover:bg-slate-900 hover:text-white transition-colors"
              >
                Browse Archives
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer strip */}
        <div className="border-t border-slate-200 bg-slate-50">
          <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-slate-500">
              The Octagon — Sacramento Country Day School
            </p>
            <a
              href="mailto:octagon@sacds.org"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Contact us →
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
