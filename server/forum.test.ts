import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { LAND_PROJECTS_CATEGORY_SLUG, TEAM_USER_NAME } from "./lib/team-user";

const skipIfNoDb = !process.env.DATABASE_URL;

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "google",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as AuthenticatedUser;
  return {
    user,
    authMethod: "legacy",
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    authMethod: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("forum.categories", () => {
  it.skipIf(skipIfNoDb)("returns a list of categories (public access)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const categories = await caller.forum.categories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    // Each category should have required fields
    const first = categories[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("slug");
    expect(first).toHaveProperty("description");
  });
});

describe("forum.categoryBySlug", () => {
  it.skipIf(skipIfNoDb)("returns a category by slug", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const category = await caller.forum.categoryBySlug({ slug: "general" });
    expect(category).toBeTruthy();
    expect(category!.slug).toBe("general");
    expect(category!.name).toBe("General Discussion");
  });

  it.skipIf(skipIfNoDb)("returns null for non-existent slug", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const category = await caller.forum.categoryBySlug({ slug: "nonexistent-slug-xyz" });
    expect(category).toBeNull();
  });
});

describe("forum.posts", () => {
  it.skipIf(skipIfNoDb)("returns posts list (public access)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.forum.posts({ limit: 10 });
    expect(result).toHaveProperty("posts");
    expect(result).toHaveProperty("nextCursor");
    expect(Array.isArray(result.posts)).toBe(true);
    // We created a test post earlier, so there should be at least one
    if (result.posts.length > 0) {
      const first = result.posts[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("title");
      expect(first).toHaveProperty("content");
      expect(first).toHaveProperty("authorName");
    }
  });

  it.skipIf(skipIfNoDb)("filters posts by categoryId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Category 1 = General Discussion (has our test post)
    const result = await caller.forum.posts({ categoryId: 1, limit: 10 });
    expect(Array.isArray(result.posts)).toBe(true);
    // All returned posts should be in category 1
    for (const post of result.posts) {
      expect(post.categoryId).toBe(1);
    }
  });
});

describe("forum.createPost", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.forum.createPost({
        categoryId: 1,
        title: "Test Post",
        content: "This is a test post content that is long enough.",
      })
    ).rejects.toThrow();
  });

  it.skipIf(skipIfNoDb)("creates a post when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const post = await caller.forum.createPost({
      categoryId: 1,
      title: "Test Forum Post from Vitest",
      content: "This is a test post created during automated testing to verify forum functionality.",
    });
    expect(post).toHaveProperty("id");
    expect(post.id).toBeGreaterThan(0);
  });
});

describe("forum.postById", () => {
  it.skipIf(skipIfNoDb)("returns a post by id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Don't hardcode id 1: forum reseeds and id sequence drift make
    // any specific id fragile. Pull the first post from the list and
    // assert that postById returns the same row.
    const list = await caller.forum.posts({ limit: 1 });
    const firstId = list.posts[0]?.id;
    if (!firstId) {
      // Empty forum (fresh DB); the assertion below would not be
      // meaningful. Just verify postById errors cleanly for a
      // missing id, which the next test already covers.
      return;
    }
    const post = await caller.forum.postById({ id: firstId });
    expect(post).toBeTruthy();
    expect(post!.id).toBe(firstId);
    expect(post!.title).toBeTruthy();
  });

  it("throws NOT_FOUND for non-existent post", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.forum.postById({ id: 999999 })
    ).rejects.toThrow();
  });
});

describe("forum land-projects authorship", () => {
  it.skipIf(skipIfNoDb)("lists Land Projects catalog threads as the ReGen Civics Team", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const category = await caller.forum.categoryBySlug({ slug: LAND_PROJECTS_CATEGORY_SLUG });
    if (!category) return;
    const result = await caller.forum.posts({ categoryId: category.id, limit: 50 });
    for (const post of result.posts) {
      expect(post.authorName).toBe(TEAM_USER_NAME);
    }
    const lapa = result.posts.find((p) => p.title.includes("Lapa do Beijo"));
    if (!lapa) return;
    const detail = await caller.forum.postById({ id: lapa.id });
    expect(detail.authorName).toBe(TEAM_USER_NAME);
    expect(detail.authorHandle).toBe("regen-civics-team");
  });
});

describe("forum.likes", () => {
  it.skipIf(skipIfNoDb)("returns like data for a post (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const likes = await caller.forum.likes({ postId: 1 });
    expect(likes).toHaveProperty("postLikes");
    expect(likes).toHaveProperty("likedPost");
    expect(likes).toHaveProperty("replyLikes");
    expect(likes).toHaveProperty("likedReplies");
    expect(typeof likes.postLikes).toBe("number");
    expect(likes.likedPost).toBe(false); // Not authenticated
  });
});
