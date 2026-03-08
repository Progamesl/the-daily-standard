import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { OctoBlock } from "@/components/games/OctoBlock";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GamesPage() {
  const { user, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  // Developer-only access - check if user is authenticated as admin
  if (!isAuthenticated || !user) {
    return (
      <Layout>
        <DocumentHead title="Games - The Octagon" />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-center p-8 max-w-md">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
                <Lock className="h-10 w-10 text-slate-400" />
              </div>
            </div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 mb-3">
              Developer Access Only
            </h1>
            <p className="text-slate-600 mb-6">
              This section is currently under development and is only accessible to developers.
            </p>
            <Button onClick={() => navigate("/admin/login?returnTo=/games")}>
              Sign In as Developer
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <DocumentHead title="Games - The Octagon" />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Header */}
        <div className="flow-container py-12 sm:py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <span className="text-sm font-bold uppercase tracking-widest text-indigo-600">
                Developer Preview
              </span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-4">
              Games
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Play The Octagon's signature games. Coming soon to all readers.
            </p>
          </div>

          {/* Games Grid */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Octo-Block - Featured */}
              <div className="md:col-span-2 lg:col-span-3">
                <OctoBlock />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
