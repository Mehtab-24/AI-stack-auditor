-- SQL schema for AI Stack Auditor database

-- Enable pgcrypto for UUID generation if needed (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Policies for businesses
CREATE POLICY select_businesses ON public.businesses 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY insert_businesses ON public.businesses 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_businesses ON public.businesses 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY delete_businesses ON public.businesses 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 2. Tools Table
CREATE TABLE IF NOT EXISTS public.tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    tool_name TEXT NOT NULL,
    vendor TEXT NOT NULL,
    category TEXT NOT NULL,
    plan_tier TEXT NOT NULL,
    monthly_cost NUMERIC NOT NULL,
    seats_purchased INTEGER NOT NULL,
    seats_active_estimated INTEGER,
    is_ai_addon BOOLEAN DEFAULT false NOT NULL,
    source TEXT NOT NULL, -- e.g., 'csv', 'invoice', 'manual'
    renewal_date DATE
);

-- Enable RLS
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Policies for tools
CREATE POLICY select_tools ON public.tools 
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = tools.business_id AND user_id = auth.uid())
    );

CREATE POLICY insert_tools ON public.tools 
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = tools.business_id AND user_id = auth.uid())
    );

CREATE POLICY update_tools ON public.tools 
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = tools.business_id AND user_id = auth.uid())
    );

CREATE POLICY delete_tools ON public.tools 
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = tools.business_id AND user_id = auth.uid())
    );


-- 3. Findings Table
CREATE TABLE IF NOT EXISTS public.findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    tool_id UUID REFERENCES public.tools(id) ON DELETE SET NULL,
    finding_type TEXT NOT NULL, -- e.g., 'Duplicate', 'Underused', 'Overpriced Tier', 'Inactive Seats', 'Hidden Add-on', 'Renewal Risk'
    description TEXT NOT NULL,
    confidence_score NUMERIC NOT NULL,
    generated_by_agent TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

-- Policies for findings
CREATE POLICY select_findings ON public.findings 
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = findings.business_id AND user_id = auth.uid())
    );

CREATE POLICY insert_findings ON public.findings 
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = findings.business_id AND user_id = auth.uid())
    );

CREATE POLICY update_findings ON public.findings 
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = findings.business_id AND user_id = auth.uid())
    );

CREATE POLICY delete_findings ON public.findings 
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = findings.business_id AND user_id = auth.uid())
    );


-- 4. Recommendations Table
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID REFERENCES public.findings(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL, -- e.g., 'Retain', 'Downgrade', 'Cancel', 'Consolidate', 'Review Renewal'
    suggested_alternative TEXT,
    estimated_monthly_savings NUMERIC NOT NULL,
    estimated_annual_savings NUMERIC NOT NULL,
    status TEXT DEFAULT 'draft' NOT NULL -- e.g., 'draft', 'approved', 'dismissed'
);

-- Enable RLS
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for recommendations
CREATE POLICY select_recommendations ON public.recommendations 
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.findings f 
            JOIN public.businesses b ON f.business_id = b.id 
            WHERE f.id = recommendations.finding_id AND b.user_id = auth.uid()
        )
    );

CREATE POLICY insert_recommendations ON public.recommendations 
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.findings f 
            JOIN public.businesses b ON f.business_id = b.id 
            WHERE f.id = recommendations.finding_id AND b.user_id = auth.uid()
        )
    );

CREATE POLICY update_recommendations ON public.recommendations 
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.findings f 
            JOIN public.businesses b ON f.business_id = b.id 
            WHERE f.id = recommendations.finding_id AND b.user_id = auth.uid()
        )
    );

CREATE POLICY delete_recommendations ON public.recommendations 
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.findings f 
            JOIN public.businesses b ON f.business_id = b.id 
            WHERE f.id = recommendations.finding_id AND b.user_id = auth.uid()
        )
    );


-- 5. Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_monthly_savings NUMERIC NOT NULL,
    total_annual_savings NUMERIC NOT NULL,
    export_url TEXT
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies for reports
CREATE POLICY select_reports ON public.reports 
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = reports.business_id AND user_id = auth.uid())
    );

CREATE POLICY insert_reports ON public.reports 
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = reports.business_id AND user_id = auth.uid())
    );

CREATE POLICY update_reports ON public.reports 
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = reports.business_id AND user_id = auth.uid())
    );

CREATE POLICY delete_reports ON public.reports 
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = reports.business_id AND user_id = auth.uid())
    );
