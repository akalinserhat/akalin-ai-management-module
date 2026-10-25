# @akalin/ai_management_module

Webakus ERP ve Admin ekosistemi için bağımsız, modüler ve `@akalin/module_core` (`IModuleDefinition` / `ModuleRegistry`) uyumlu Yapay Zeka & LLM Yönetim Modülü.

## Özellikler

- **Model Sağlayıcıları Yönetimi (`AiSaglayicilar`, `AiSaglayiciForm`)**: OpenAI, Google Gemini, Anthropic Claude, DeepSeek ve Yerel Ollama sağlayıcı yapılandırmaları, API anahtarları, model havuzları ve canlı bağlantı testi.
- **API Protokolleri & Scriptler (`AiProtokoller`, `AiProtokolForm`)**: Jint JavaScript motoruyla derleme gerektirmeyen dinamik `buildRequest`, `parseResponse` ve `parseModels` scriptleri ve canlı test konsolu.
- **Ajanlar & MCP Yönetimi (`AiAjanlar`, `AiAjanForm`)**: ERP ve Admin kapsamlarındaki otonom AI uzman ajanları, kuralları, prompt şablonları, Model Context Protocol (MCP) araç yetkileri ve OOP miras hiyerarşisi.
- **Token Cüzdanı & Satış (`AiTokenYonetimi`)**: Multi-tenant firma token cüzdanları, kredi yükleme, model bazlı tarife/kredi çarpanları ve canlı harcama günlüğü (Ledger).
- **Yapay Zeka Ayarları Hub'ı (`YapayZekaAyarlari`)**: `BaseSystemPage` üzerinde tüm AI ayar modüllerinin bir arada yönetimi ve Akıllı Yanıt Sentezi anahtarı.
- **Sıfır Alt Düğme Mimarisi**: Tüm form işlemleri `BaseCardPage` ve `ActionMenu` üzerinden yönetilir.
- **Sıfır Inline Validasyon & Sıfır Hardcoded Metin**: Modüler validatörler ve %100 `i18n` uyumluluğu.
