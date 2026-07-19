"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Camera,
  QrCode,
  Download,
  Smartphone,
  Heart,
  PartyPopper,
  Building2,
  Sparkles,
  ImageIcon,
  Shield,
  Mail,
  Instagram,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" },
  }),
};

const steps = [
  {
    icon: Sparkles,
    title: "Etkinliğinizi oluşturun",
    description:
      "Düğün, doğum günü veya kurumsal etkinliğiniz için birkaç dakikada galeri açın.",
  },
  {
    icon: QrCode,
    title: "QR kodu paylaşın",
    description:
      "Masalara, davetiyeye veya ekrana QR kodu koyun. Misafirler tarayıp anında yüklesin.",
  },
  {
    icon: Camera,
    title: "Anıları toplayın",
    description:
      "Tüm fotoğraf ve videolar tek galeride birleşir. İstediğiniz zaman toplu indirin.",
  },
];

const features = [
  {
    icon: Smartphone,
    title: "Uygulama gerekmez",
    description: "Misafirler telefon tarayıcısından yükler. Hesap açmaya gerek yok.",
  },
  {
    icon: ImageIcon,
    title: "Canlı galeri",
    description: "Yüklenen medyalar anında galeride görünür, etkinlik boyunca paylaşılır.",
  },
  {
    icon: Download,
    title: "Toplu indirme",
    description: "Etkinlik sonrası tüm fotoğraf ve videoları tek tıkla indirin.",
  },
  {
    icon: Shield,
    title: "Güvenli ve özel",
    description: "Her etkinliğin benzersiz linki vardır. Sadece davetliler erişebilir.",
  },
];

const useCases = [
  { icon: Heart, label: "Düğün & Nişan" },
  { icon: PartyPopper, label: "Doğum Günü & Parti" },
  { icon: Building2, label: "Kurumsal Etkinlik" },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#1D1D1D]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#EEE8E1]/80 bg-[#F8F5F0]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-['Cormorant_Garamond'] text-2xl font-light tracking-wider">
            Kadraj<span className="text-[#C8A96A]">ım</span>
          </Link>
          <nav>
            <a
              href="#nasil-calisir"
              className="text-sm text-[#5C5C5C] transition hover:text-[#1D1D1D]"
            >
              Nasıl Çalışır
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-1/4 top-1/4 h-40 w-40 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(200, 169, 106, 0.12)" }}
        />
        <motion.div
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 left-1/4 h-48 w-48 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(111, 126, 104, 0.08)" }}
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.p
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-6 font-['Cormorant_Garamond'] text-xs font-light uppercase tracking-[0.3em] text-[#8B8B8B] sm:text-sm"
          >
            Etkinlik fotoğraf paylaşımı
          </motion.p>

          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-8 flex items-center justify-center gap-3"
          >
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C8A96A]" />
            <div className="h-1.5 w-1.5 rounded-full bg-[#C8A96A]" />
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C8A96A]" />
          </motion.div>

          <motion.h1
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-6 font-['Cormorant_Garamond'] text-4xl font-light leading-tight tracking-wide sm:text-6xl lg:text-7xl"
          >
            Her karede bir anı,
            <br />
            <span className="italic text-[#C8A96A]">hepsi bir arada</span>
          </motion.h1>

          <motion.p
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mx-auto mb-10 max-w-2xl font-['Cormorant'] text-base font-light italic leading-relaxed text-[#5C5C5C] sm:text-lg"
          >
            Misafirleriniz QR kodu tarayıp fotoğraf ve video yüklesin — uygulama indirmeye,
            hesap açmaya gerek yok. Siz tüm anıları tek galeride toplayın.
          </motion.p>

          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex justify-center"
          >
            <a
              href="#nasil-calisir"
              className="inline-flex items-center gap-2 rounded-full border border-[#C8A96A]/40 bg-white px-8 py-3.5 text-sm font-medium text-[#1D1D1D] transition hover:border-[#C8A96A]"
            >
              Nasıl Çalışır?
            </a>
          </motion.div>

          <motion.p
            custom={5}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-8 text-xs tracking-wide text-[#8B8B8B]"
          >
            Misafirler için uygulama yok · Hesap gerekmez · Mobil uyumlu
          </motion.p>
        </div>
      </section>

      {/* How it works */}
      <section id="nasil-calisir" className="bg-white px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 font-['Cormorant_Garamond'] text-xs uppercase tracking-[0.25em] text-[#C8A96A]">
              3 adımda hazır
            </p>
            <h2 className="font-['Cormorant_Garamond'] text-3xl font-light tracking-wide sm:text-4xl">
              Nasıl çalışır?
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative rounded-2xl border border-[#EEE8E1] bg-[#FDFCFA] p-8 text-center"
              >
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F8F5F0]">
                  <step.icon className="h-6 w-6 text-[#C8A96A]" />
                </div>
                <span className="mb-3 block font-['Cormorant_Garamond'] text-sm text-[#C8A96A]">
                  0{i + 1}
                </span>
                <h3 className="mb-3 font-['Cormorant_Garamond'] text-xl font-light">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#5C5C5C]">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 font-['Cormorant_Garamond'] text-xs uppercase tracking-[0.25em] text-[#C8A96A]">
              Özellikler
            </p>
            <h2 className="font-['Cormorant_Garamond'] text-3xl font-light tracking-wide sm:text-4xl">
              Neden Kadrajım?
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl border border-[#EEE8E1] bg-white p-6"
              >
                <feature.icon className="mb-4 h-5 w-5 text-[#C8A96A]" />
                <h3 className="mb-2 font-['Cormorant_Garamond'] text-lg font-light">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#5C5C5C]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-white px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 font-['Cormorant_Garamond'] text-xs uppercase tracking-[0.25em] text-[#C8A96A]">
            Her etkinlik için
          </p>
          <h2 className="mb-12 font-['Cormorant_Garamond'] text-3xl font-light tracking-wide sm:text-4xl">
            Hangi etkinliklerde kullanılır?
          </h2>

          <div className="flex flex-wrap justify-center gap-4">
            {useCases.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-full border border-[#EEE8E1] bg-[#FDFCFA] px-6 py-3"
              >
                <item.icon className="h-4 w-4 text-[#C8A96A]" />
                <span className="text-sm text-[#1D1D1D]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#EEE8E1] bg-white px-8 py-14 text-center sm:px-16">
          <h2 className="mb-4 font-['Cormorant_Garamond'] text-3xl font-light tracking-wide sm:text-4xl">
            Anılarınızı bir araya getirin
          </h2>
          <p className="text-sm leading-relaxed text-[#5C5C5C] sm:text-base">
            Etkinliğiniz için galeri oluşturun, QR kodunuzu paylaşın ve misafirlerinizden
            gelen her kareyi tek yerde toplayın.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-white px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 font-['Cormorant_Garamond'] text-xs uppercase tracking-[0.25em] text-[#C8A96A]">
            İletişim
          </p>
          <h2 className="mb-8 font-['Cormorant_Garamond'] text-3xl font-light tracking-wide sm:text-4xl">
            Bize ulaşın
          </h2>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="mailto:rivaeventdesign@gmail.com"
              className="inline-flex items-center gap-2 rounded-full border border-[#EEE8E1] bg-[#FDFCFA] px-6 py-3 text-sm text-[#5C5C5C] transition hover:border-[#C8A96A] hover:text-[#C8A96A]"
            >
              <Mail className="h-4 w-4" />
              rivaeventdesign@gmail.com
            </a>
            <a
              href="https://instagram.com/rivaeventdesign"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#EEE8E1] bg-[#FDFCFA] px-6 py-3 text-sm text-[#5C5C5C] transition hover:border-[#C8A96A] hover:text-[#C8A96A]"
            >
              <Instagram className="h-4 w-4" />
              @rivaeventdesign
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#EEE8E1] bg-white px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-['Cormorant_Garamond'] text-xl font-light tracking-wider">
            Kadraj<span className="text-[#C8A96A]">ım</span>
          </p>
          <p className="text-xs text-[#8B8B8B]">
            © {new Date().getFullYear()} kadrajim.com — Etkinlik anılarını paylaşmanın en kolay yolu
          </p>
        </div>
      </footer>
    </div>
  );
}
