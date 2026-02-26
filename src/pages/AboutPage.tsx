import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink } from "lucide-react";

export default function AboutPage() {
  return (
    <Layout>
      <div className="flow-container py-12 md:py-16 animate-fade-in">
        <div className="max-w-3xl mx-auto">
          <header className="mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">About The Octagon</h1>
            <p className="dek text-lg text-muted-foreground leading-relaxed">
              The student-run newspaper of Sacramento Country Day School, committed to unbiased and comprehensive reporting since our founding.
            </p>
          </header>

          <div className="article-body space-y-0">

            {/* Mission */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4 text-foreground">Mission Statement</h2>
              <p className="text-slate-700 leading-relaxed text-lg">
                The Octagon is the student-run newspaper of Sacramento Country Day high school. The print edition is published eight times a year, and the website is updated daily. The Octagon is committed to unbiased and comprehensive reporting, serving as a source of reliable information for SCDS students as well as the school and Sacramento community. The Octagon will publish timely and relevant news deemed appropriate by the editors-in-chief and adviser. We seek to highlight school-related events and spotlight the voices of those with a story to share.
              </p>
            </section>

            <hr className="border-border my-8" />

            {/* Editorial Policy */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4 text-foreground">Editorial Policy</h2>
              <p className="text-slate-700 leading-relaxed text-lg">
                Editorials shall be approved by and reflect the opinions of the editorial staff, which includes the editors-in-chief, page editors, section editors and copy editors. Columns and commentaries shall be clearly labeled as such and will represent only the opinions of the authors.
              </p>
              <p className="text-slate-700 leading-relaxed text-lg mt-4">
                In the interest of representing all points of view, letters to the editor will be published, space permitting. The editors-in-chief and adviser may reject letters if the content is deemed inappropriate, offensive or false. All letters must be signed and conform to the above restrictions on published material. The staff retains the right to edit letters for grammar, punctuation and space considerations.
              </p>
            </section>

            <hr className="border-border my-8" />

            {/* Corrections Policy */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4 text-foreground">Corrections Policy</h2>
              <p className="text-slate-700 leading-relaxed text-lg">
                The Octagon's policy is to correct factual errors and to clarify potentially confusing statements. Corrections due to significant errors will be noted at the bottom of stories online and will appear on Page 2 of the next print edition. For minor corrections, such as punctuation, the story will be modified online without the publication of any statement at the bottom of the story.
              </p>
            </section>

            <hr className="border-border my-8" />

            {/* Story Removal Policy */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4 text-foreground">Story Removal Policy</h2>
              <p className="text-slate-700 leading-relaxed text-lg">
                Following well-established journalism ethics and practices, rarely will The Octagon remove published content. Requests to do so will be reviewed by the editors-in-chief and the adviser. If content information is determined to be inaccurate, in most cases, corrections will be made following the above policy. The editors and the adviser will evaluate requests for any other reasons on a case-by-case basis.
              </p>
            </section>

            <hr className="border-border my-8" />

            {/* Quote Check Policy */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4 text-foreground">Quote Check Policy</h2>
              <p className="text-slate-700 leading-relaxed text-lg">
                With the exception of quote checking, The Octagon does not share unpublished content outside the newspaper staff. Stories will not be shared in their entirety with sources before publication. For the sake of accuracy, sources who have been interviewed for a story may ask to have their direct quotations read back to them or the recording of a quotation played back to them. They may not, however, change what they already have said.
              </p>
            </section>

            <hr className="border-border my-8" />

            {/* Comment Policy */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4 text-foreground">Comment Policy</h2>
              <p className="text-slate-700 leading-relaxed text-lg">
                Respectful comments on stories online are encouraged. All comments are moderated by the online editors-in-chief and the adviser. Remarks containing ad hominem attacks toward the writer will not be posted. We reserve the right to remove any comment the editors-in-chief and adviser deem inappropriate. To make a comment, a valid name and email address are required for confirmation, but the email address will not be displayed on the site.
              </p>
            </section>

            <hr className="border-border my-8" />

            {/* Print Archives */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4 text-foreground">Print Archives</h2>
              <p className="text-slate-700 leading-relaxed text-lg mb-6">
                Archives of our print editions are available on Issuu. Browse every issue published by The Octagon — from our most recent edition all the way back through our history.
              </p>
              <a
                href="https://issuu.com/octagon25"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 rounded-lg font-semibold hover:opacity-80 transition-opacity"
              >
                <BookOpen className="h-4 w-4" />
                View Print Archives on Issuu
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            </section>

            <hr className="border-border my-8" />

            {/* Contact */}
            <section className="mb-4">
              <h2 className="font-serif text-2xl font-bold mb-4 text-foreground">Contact Us</h2>
              <p className="text-slate-700 leading-relaxed text-lg mb-6">
                We welcome feedback, news tips, corrections, and letters to the editor. Reach our newsroom at{" "}
                <a href="mailto:octagon@scdsstudent.org" className="text-foreground font-medium underline underline-offset-2 hover:opacity-80 transition-opacity">
                  octagon@scdsstudent.org
                </a>
                {" "}or use our contact form.
              </p>
              <Link to="/contact">
                <Button variant="default" size="lg" className="font-semibold">
                  Get in Touch
                </Button>
              </Link>
            </section>

          </div>
        </div>
      </div>
    </Layout>
  );
}
