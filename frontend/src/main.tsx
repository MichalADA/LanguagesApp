import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "@/i18n";
import { CourseProvider } from "@/courses/CourseProvider";
import { VocabularyProvider } from "@/vocabulary/VocabularyProvider";
import { GrammarProvider } from "@/grammar/GrammarProvider";
import { ProgressProvider } from "@/progress/ProgressProvider";
import { AuthProvider } from "@/auth/AuthContext";
import { CurriculumProvider } from "@/curriculum/CurriculumProvider";
import "./styles.css";

/**
 * Kolejność providerów jest znacząca: słownik i postęp zależą od aktywnego kursu.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <CourseProvider>
            <VocabularyProvider>
              <GrammarProvider>
                <ProgressProvider>
                  <CurriculumProvider>
                    <App />
                  </CurriculumProvider>
                </ProgressProvider>
              </GrammarProvider>
            </VocabularyProvider>
          </CourseProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
