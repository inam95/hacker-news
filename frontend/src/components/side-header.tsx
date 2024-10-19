import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { MenuIcon } from "lucide-react";

import { userQueryOptions } from "@/lib/api";

import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export function SideHeader() {
  const { data: user } = useQuery(userQueryOptions());
  const [isOpen, setIsOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full border-border/40 bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/90">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <Link to="/" onClick={() => setIsOpen(false)} className="text-2xl font-bold">
            Hacker News
          </Link>
          <nav className="hidden items-center space-x-4 md:flex">
            <Link to="/" onClick={() => setIsOpen(false)} className="hover:underline">
              new
            </Link>
            <Link to="/" onClick={() => setIsOpen(false)} className="hover:underline">
              top
            </Link>
            <Link to="/" onClick={() => setIsOpen(false)} className="hover:underline">
              submit
            </Link>
          </nav>
        </div>
        <div className="hidden items-center space-x-4 md:flex">
          {user ? (
            <>
              <span>{user}</span>
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="bg-secondary-foreground text-primary-foreground hover:bg-secondary-foreground/70"
              >
                <a href="/api/auth/logout">Logout</a>
              </Button>
            </>
          ) : (
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="bg-secondary-foreground text-primary-foreground hover:bg-secondary-foreground/70"
            >
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="md:hidden">
              <MenuIcon className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent className="mb-2">
            <SheetHeader>
              <SheetTitle>Hacker News</SheetTitle>
              <SheetDescription className="sr-only">Navigation</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col space-y-4">
              <Link to="/" onClick={() => setIsOpen(false)} className="hover:underline">
                new
              </Link>
              <Link to="/" onClick={() => setIsOpen(false)} className="hover:underline">
                top
              </Link>
              <Link to="/" onClick={() => setIsOpen(false)} className="hover:underline">
                submit
              </Link>
              {user ? (
                <>
                  <span>user: {user}</span>
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="bg-secondary-foreground text-primary-foreground hover:bg-secondary-foreground/70"
                  >
                    <a href="/api/auth/logout">Logout</a>
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="bg-secondary-foreground text-primary-foreground hover:bg-secondary-foreground/70"
                >
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    Login
                  </Link>
                </Button>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
