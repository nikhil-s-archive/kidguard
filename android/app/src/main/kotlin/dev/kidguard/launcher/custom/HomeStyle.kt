package dev.kidguard

import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * Pure colour maths for the kid launcher (WCAG 2.x relative luminance / contrast ratio) and its palettes.
 * Colours are ARGB ints, like android.graphics.Color, but no Android class is used: unit-tested in HomeStyleTest.
 */
object Contrast {
    const val TEXT = 4.5    // body text (WCAG AA)
    const val LARGE = 3.0   // icons, glyphs, large text, page dots

    const val WHITE = -0x1                 // #ffffffff
    val INK = hex("#000000")               // the app's dark text

    fun hex(s: String): Int {
        val h = s.removePrefix("#")
        val v = h.toLong(16)
        return if (h.length == 6) (0xff000000 or v).toInt() else v.toInt()
    }

    fun a(c: Int) = (c ushr 24) and 0xff
    fun r(c: Int) = (c shr 16) and 0xff
    fun g(c: Int) = (c shr 8) and 0xff
    fun b(c: Int) = c and 0xff
    fun argb(a: Int, r: Int, g: Int, b: Int) = (a shl 24) or (r shl 16) or (g shl 8) or b

    private fun lin(ch: Int): Double { val s = ch / 255.0; return if (s <= 0.03928) s / 12.92 else ((s + 0.055) / 1.055).pow(2.4) }

    /** Relative luminance 0..1 (alpha ignored). */
    fun lum(c: Int): Double = 0.2126 * lin(r(c)) + 0.7152 * lin(g(c)) + 0.0722 * lin(b(c))

    /** Contrast ratio 1..21 of two opaque colours. */
    fun ratio(x: Int, y: Int): Double { val lx = lum(x); val ly = lum(y); return (max(lx, ly) + 0.05) / (min(lx, ly) + 0.05) }

    /** [top] (its alpha is used) painted over the opaque [bottom]. */
    fun over(top: Int, bottom: Int): Int {
        val t = a(top) / 255.0
        fun ch(f: (Int) -> Int) = (f(top) * t + f(bottom) * (1 - t) + 0.5).toInt().coerceIn(0, 255)
        return argb(255, ch(::r), ch(::g), ch(::b))
    }

    /** [c] with alpha [alpha] 0..1. */
    fun alpha(c: Int, alpha: Double) = (((alpha * 255 + 0.5).toInt().coerceIn(0, 255)) shl 24) or (c and 0xffffff)

    /**
     * Glyph / text colour for a shape filled with [fill]: [light] (white) when it reaches [need], else [dark], else
     * whichever is higher. A solid accent / red / green fill gets white, a tinted or light fill gets the dark one.
     */
    fun on(fill: Int, light: Int = WHITE, dark: Int = INK, need: Double = TEXT): Int = when {
        ratio(light, fill) >= need -> light
        ratio(dark, fill) >= need -> dark
        ratio(light, fill) >= ratio(dark, fill) -> light
        else -> dark
    }
}

/** Text colour on the wallpaper: [text] + a soft [shadow] (looks only), and a [scrim] (alpha 0 = none) that makes [ratio] hold. */
data class Ink(val text: Int, val shadow: Int, val scrim: Int, val darkText: Boolean, val ratio: Double)

/** One of the 8 accents the kid can pick. [solid]: filled buttons (white glyph, both themes). */
data class Accent(val id: String, val solid: Int, val tintL: Int, val textL: Int, val tintD: Int, val textD: Int)

/** Every colour role the launcher paints, for one accent and light / dark. */
data class Palette(
    val dark: Boolean,
    val bg: Int,            // drawer / sheet background
    val card: Int,          // widget card surface (has alpha: it sits on the wallpaper)
    val text: Int, val sub: Int, val stroke: Int,
    val solid: Int, val onSolid: Int,          // primary button, "Xin giờ" circle
    val tint: Int, val onTint: Int,            // tinted circles (Tới nơi, Đón con), menu icons
    val accentText: Int,                       // accent text on the card ("1 giờ 05 phút")
    val danger: Int, val onDanger: Int, val dangerText: Int,   // SOS
    val warn: Int, val onWarn: Int, val warnText: Int, val warnTint: Int,   // clock badge, out-of-time card
    val sheet: Int,         // opaque card for menus / sheets
)

object HomeStyle {
    private fun h(s: String) = Contrast.hex(s)

    val ACCENTS = listOf(
        Accent("blue", h("#0066d6"), h("#e5f1ff"), h("#0051a8"), h("#162a45"), h("#64b5ff")),
        Accent("orange", h("#b25000"), h("#fff4e0"), h("#8a3d00"), h("#422006"), h("#ff9f0a")),
        Accent("violet", h("#7c3aed"), h("#ede9fe"), h("#5b21b6"), h("#4c1d95"), h("#c4b5fd")),
        Accent("pink", h("#be185d"), h("#fce7f3"), h("#9d174d"), h("#831843"), h("#f9a8d4")),
        Accent("green", h("#1f7a34"), h("#e3f9e8"), h("#1b6e30"), h("#12301d"), h("#30d158")),
        Accent("teal", h("#0f766e"), h("#ccfbf1"), h("#115e59"), h("#134e4a"), h("#5eead4")),
        Accent("red", h("#d70015"), h("#ffe5e5"), h("#a80010"), h("#3b1519"), h("#ff6961")),
        Accent("slate", h("#636366"), h("#e5e5ea"), h("#3a3a3c"), h("#2c2c2e"), h("#aeaeb2")),
    )

    fun accent(id: String): Accent = ACCENTS.firstOrNull { it.id == id } ?: ACCENTS[0]

    /** Card opacity on the wallpaper: high enough that its own content passes over pure black or pure white. */
    const val CARD_ALPHA_LIGHT = 0.93
    const val CARD_ALPHA_DARK = 0.92

    fun palette(accentId: String, dark: Boolean): Palette {
        val a = accent(accentId)
        val danger = h("#d70015"); val warn = h(if (dark) "#ff9f0a" else "#b25000")   // dark: lighter fill, dark glyph
        return if (!dark) Palette(false, h("#f2f2f7"), Contrast.alpha(h("#ffffff"), CARD_ALPHA_LIGHT), h("#000000"), h("#636366"), h("#e5e5ea"),
            a.solid, Contrast.on(a.solid), a.tintL, a.textL, a.textL,
            danger, Contrast.on(danger), h("#a80010"),
            warn, Contrast.on(warn), h("#8a3d00"), h("#fff4e0"), h("#ffffff"))
        else Palette(true, h("#000000"), Contrast.alpha(h("#1c1c1e"), CARD_ALPHA_DARK), h("#ffffff"), h("#98989d"), h("#38383a"),
            a.solid, Contrast.on(a.solid), a.tintD, a.textD, a.textD,
            danger, Contrast.on(danger), h("#ff6961"),
            warn, Contrast.on(warn), h("#ff9f0a"), h("#3a2a0b"), h("#1c1c1e"))
    }

    /** The card surface in the worst case: over a pure black and a pure white wallpaper. */
    fun cardWorst(p: Palette): List<Int> = listOf(Contrast.over(p.card, h("#000000")), Contrast.over(p.card, h("#ffffff")))

    data class Preset(val id: String, val cols: Int, val rows: Int, val iconDp: Int, val labels: Boolean,
                      val wallLight: String, val wallDark: String, val accentLight: String, val accentDark: String,
                      val clock: String, val timeW: Int, val dockLabels: Boolean, val dockBg: Boolean)

    /** "Bé" 6-10, "Thiếu niên", "Gọn". [timeW] 0 = full width. */
    val PRESETS = listOf(
        Preset("be", 3, 4, 72, true, "sky", "night", "blue", "blue", "big", 0, true, true),
        Preset("teen", 4, 5, 58, true, "sunset", "aurora", "blue", "blue", "normal", 0, false, true),
        Preset("gon", 5, 6, 50, true, "graphite", "graphite", "blue", "blue", "thin", 2, false, false),
    )
    fun preset(id: String): Preset = PRESETS.firstOrNull { it.id == id } ?: PRESETS[1]

    val WALLS = listOf("sky", "night", "sunset", "aurora", "graphite", "ocean", "forest", "candy", "mint", "space", "dusk", "berry", "ember", "bloom", "lagoon", "nebula")

    private val LIGHT_INK = h("#ffffff")
    private val DARK_INK = h("#000000")

    /**
     * Ink for text on a wallpaper region given as its downsampled pixels [px] (e.g. 32x32). The worst pixel decides
     * (after dropping the brightest / darkest [outlier] share: a star or a cloud edge). Picks light or dark text,
     * then adds the smallest scrim (black under light text, white under dark) that brings every kept pixel to [need].
     */
    fun ink(px: IntArray, need: Double = Contrast.TEXT, outlier: Double = 0.03): Ink {
        if (px.isEmpty()) return Ink(DARK_INK, Contrast.alpha(LIGHT_INK, 0.55), 0, true, 21.0)
        val sorted = px.sortedBy { Contrast.lum(it) }
        val cut = (sorted.size * outlier).toInt()
        val dark = sorted.subList(0, sorted.size - cut)        // for light text the brightest pixels are the risk
        val light = sorted.subList(cut, sorted.size)           // for dark text the darkest ones
        fun worst(text: Int, list: List<Int>, scrim: Int) = list.minOf { Contrast.ratio(text, if (scrim == 0) it else Contrast.over(scrim, it)) }
        val wl = worst(LIGHT_INK, dark, 0); val wd = worst(DARK_INK, light, 0)
        val useDark = wd >= wl
        val text = if (useDark) DARK_INK else LIGHT_INK
        val list = if (useDark) light else dark
        val shadow = if (useDark) Contrast.alpha(LIGHT_INK, 0.55) else Contrast.alpha(h("#000000"), 0.45)
        val best = max(wl, wd)
        if (best >= need) return Ink(text, shadow, 0, useDark, best)
        val base = if (useDark) LIGHT_INK else h("#000000")
        var step = 1
        while (step <= 20) {
            val scrim = Contrast.alpha(base, step * 0.04)
            val w = worst(text, list, scrim)
            if (w >= need) return Ink(text, shadow, scrim, useDark, w)
            step++
        }
        val scrim = Contrast.alpha(base, 0.8)
        return Ink(text, shadow, scrim, useDark, worst(text, list, scrim))
    }
}
