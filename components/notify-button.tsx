"use client";

import { useState, useTransition } from "react";
import { sendTestPush, subscribeToPush } from "@/app/actions/meals";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function NotifyButton({ publicKey }: { publicKey: string }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function enable() {
    startTransition(async () => {
      if (!publicKey) {
        setMessage("Os avisos ainda não estão configurados no servidor.");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage("Este navegador não recebe avisos.");
        return;
      }
      if (!window.isSecureContext) {
        setMessage(
          "No celular, o aviso só funciona em HTTPS. Instale o app na tela inicial por um endereço seguro.",
        );
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Permissão negada. Ative as notificações do site no celular.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        setMessage("Não foi possível inscrever este celular.");
        return;
      }

      const result = await subscribeToPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setMessage(result.ok ? "Avisos ativos neste celular." : result.message);
    });
  }

  function test() {
    startTransition(async () => {
      const result = await sendTestPush();
      setMessage(result.message);
    });
  }

  return (
    <section className="rounded-2xl bg-ink p-4 text-white">
      <h2 className="text-lg font-semibold">Avisos no celular</h2>
      <p className="mt-2 text-sm leading-6 text-white/70">
        No horário de cada refeição chega um aviso. Se você não marcar em uma hora, chega outro.
        No iPhone, adicione o Prismático à Tela de Início antes de ativar.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={enable}
          disabled={pending}
          className="h-11 rounded-full bg-mint text-sm font-semibold text-ink disabled:opacity-60"
        >
          Ativar
        </button>
        <button
          type="button"
          onClick={test}
          disabled={pending}
          className="h-11 rounded-full text-sm font-semibold text-white ring-1 ring-white/30 disabled:opacity-60"
        >
          Testar
        </button>
      </div>
      {message && <p className="mt-3 text-sm leading-5 text-white/80">{message}</p>}
    </section>
  );
}
