"use client"

import React from 'react'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Spacely Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-gray-700">
            <p>
              Welcome to Spacely! By using our services, you agree to the following terms and conditions.
              Please read them carefully.
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>Eligibility&nbsp;–</strong> You must be at least 18&nbsp;years old and a verified student or
                staff member of Mapua Malayan Colleges Mindanao to create an account.
              </li>
              <li>
                <strong>Account Security&nbsp;–</strong> You are responsible for maintaining the confidentiality of your
                login credentials and for all activities that occur under your account.
              </li>
              <li>
                <strong>Acceptable Use&nbsp;–</strong> You agree not to upload, post, or share any content that is
                unlawful, false, misleading, defamatory, or infringing on another person's rights. We reserve the right
                to remove content that violates these rules.
              </li>
              <li>
                <strong>Listing Accuracy&nbsp;–</strong> If you post a property listing, you warrant that all information
                provided is accurate and up-to-date. Misleading listings may be removed without notice.
              </li>
              <li>
                <strong>Favorites &amp; Reports&nbsp;–</strong> The favorites and report features are provided for personal
                use. Abuse of these features (e.g., spam-reporting) may lead to account suspension.
              </li>
              <li>
                <strong>Intellectual Property&nbsp;–</strong> All trademarks, logos, and content on Spacely remain the
                property of their respective owners. You may not copy or distribute any part of the platform without
                prior written consent.
              </li>
              <li>
                <strong>Termination&nbsp;–</strong> We may suspend or terminate your account at any time for violations
                of these terms or for any behavior that we deem harmful to the community.
              </li>
              <li>
                <strong>Disclaimer&nbsp;–</strong> Spacely acts only as a venue for listing and discovering rentals. We
                do not own, manage, or inspect the properties listed. Interactions and agreements between renters and
                landlords happen independently of Spacely.
              </li>
              <li>
                <strong>Limitation of Liability&nbsp;–</strong> To the fullest extent permitted by law, Spacely shall not
                be liable for any indirect, incidental, or consequential damages arising from your use of the platform.
              </li>
              <li>
                <strong>Changes to Terms&nbsp;–</strong> We may update these terms from time to time. Continued use of the
                service after any changes constitutes acceptance of the new terms.
              </li>
            </ol>
            <p>
              If you have questions about these terms, please contact us at{' '}
              <Link href="mailto:spacely.main@gmail.com" className="text-blue-600 hover:underline">
                spacely.main@gmail.com
              </Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
} 