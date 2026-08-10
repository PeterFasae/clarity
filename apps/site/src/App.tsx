import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { FocusModeProvider } from "@/components/FocusMode";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { HowItWorks } from "@/pages/HowItWorks";
import { Accessibility } from "@/pages/Accessibility";
import { Research } from "@/pages/Research";
import { Privacy } from "@/pages/Privacy";
import { NotFound } from "@/pages/NotFound";

export function App() {
  return (
    <PreferencesProvider>
      <FocusModeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/accessibility" element={<Accessibility />} />
              <Route path="/research" element={<Research />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FocusModeProvider>
    </PreferencesProvider>
  );
}
