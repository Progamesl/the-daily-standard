import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <Layout>
      <div className="container-newspaper py-12 md:py-16 animate-fade-in">
        <div className="max-w-3xl mx-auto">
          <header className="mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">About The Chronicle</h1>
            <p className="dek">
              Delivering trusted journalism to readers around the world since 1851.
            </p>
          </header>

          <div className="article-body">
            <p>
              The Chronicle is committed to covering the news that matters most to our readers with
              accuracy, fairness, and independence. Our team of award-winning journalists works
              tirelessly to bring you comprehensive coverage of world events, politics, business,
              technology, science, arts, and more.
            </p>

            <p>
              Founded over 170 years ago, The Chronicle has grown from a small regional newspaper
              into one of the world's most respected news organizations. Our journalists report from
              every corner of the globe, bringing you firsthand accounts of the events shaping our
              world.
            </p>

            <h2 className="font-serif text-2xl font-bold mt-12 mb-4">Our Mission</h2>

            <p>
              We believe that quality journalism is essential to a healthy democracy. Our mission is
              to seek the truth and help people understand the world. We do this by producing deeply
              reported, expert journalism that sets the agenda for national and global conversations.
            </p>

            <h2 className="font-serif text-2xl font-bold mt-12 mb-4">Our Values</h2>

            <ul className="list-disc pl-6 space-y-2 text-lg">
              <li>
                <strong>Independence:</strong> We operate free from political and commercial
                influence.
              </li>
              <li>
                <strong>Accuracy:</strong> We verify facts and correct errors promptly.
              </li>
              <li>
                <strong>Fairness:</strong> We present multiple perspectives on complex issues.
              </li>
              <li>
                <strong>Transparency:</strong> We are open about our methods and sources.
              </li>
            </ul>

            <h2 className="font-serif text-2xl font-bold mt-12 mb-4">Contact Us</h2>

            <p>
              We welcome feedback from our readers. Whether you have a news tip, a correction, or
              just want to share your thoughts, we'd love to hear from you.
            </p>

            <div className="mt-8">
              <Link to="/contact">
                <Button variant="default" size="lg" className="font-semibold">
                  Get in Touch
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
